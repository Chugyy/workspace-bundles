# Architecture SSE en Production

## Vue d'ensemble

L'architecture SSE pour le streaming LLM doit gérer :
- Connexions longues (plusieurs minutes)
- Événements hétérogènes (texte, sources, tool calls)
- Interruptions utilisateur
- Timeouts infrastructure (proxies, load balancers)

## Architecture type (FastAPI + React)

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ChatInput  ──┐                                                 │
│               ├──> Context (React Query) ──> Service Layer      │
│  ChatMessages ┘                                                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ POST /chats/{id}/stream
                              │ Accept: text/event-stream
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI)                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Route Handler (chats.py)                                        │
│    │                                                             │
│    ├──> StreamManager (session + stop_event)                    │
│    ├──> LLM Gateway (provider abstraction)                      │
│    └──> async def generate() → StreamingResponse               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ Stream chunks
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    LLM Provider (OpenAI/Anthropic)               │
└──────────────────────────────────────────────────────────────────┘
```

## Format SSE standard W3C

### Structure d'un event
```
event: <type>
data: <json>
<ligne vide obligatoire>
```

### Events recommandés pour LLM
```python
# Chunk de texte
event: chunk
data: {"content": "Hello world"}

# Sources RAG
event: sources
data: {"sources": [{"id": "doc1", "similarity": 0.95}]}

# Tool call créé
event: tool_call_created
data: {"tool_call_id": "abc123"}

# Tool call mis à jour
event: tool_call_updated
data: {"tool_call_id": "abc123", "status": "completed"}

# Stream terminé
event: done
data: {}

# Erreur
event: error
data: {"message": "Connection timeout"}

# Heartbeat (keep-alive)
: keep-alive
```

**Note** : Les lignes commençant par `:` sont des commentaires SSE, ignorés par EventSource mais maintiennent la connexion active.

## Implémentation Backend (FastAPI)

### Route handler minimaliste
```python
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

@router.post("/{chat_id}/stream")
async def stream_message(
    chat_id: str,
    request: MessageStreamRequest,
    current_user: User = Depends(get_current_user)
):
    """Stream un message avec SSE"""

    # 1. Vérifier génération pas déjà en cours (409 Conflict)
    is_generating = await crud_chats.is_chat_generating(chat_id)
    if is_generating:
        raise ConflictError("Generation already in progress")

    # 2. Marquer comme en génération
    await crud_chats.update_chat_generating_status(chat_id, True)

    # 3. Générateur SSE
    async def generate():
        session = stream_manager.start_session(chat_id, current_user.id)

        try:
            async for chunk in llm_gateway.stream_with_tools(...):
                # Check stop à chaque chunk
                if session.stop_event.is_set():
                    yield sse_event("stopped", {"reason": "user_requested"})
                    break

                # Parser events spéciaux
                if chunk.startswith("[TOOL_CALL_CREATED:"):
                    yield sse_event("tool_call_created", {...})
                else:
                    yield sse_event("chunk", {"content": chunk})

            yield sse_event("done", {})

        except Exception as e:
            logger.exception("Stream error")
            yield sse_event("error", {"message": str(e)})

        finally:
            stream_manager.end_session(chat_id)
            await crud_chats.update_chat_generating_status(chat_id, False)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Nginx: désactiver buffering
        }
    )
```

### Helper SSE
```python
def sse_event(event_type: str, data: dict) -> str:
    """Format SSE standard W3C"""
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
```

## Implémentation Frontend (React + TypeScript)

### Service Layer avec Fetch API
```typescript
async streamMessage(
  chatId: string,
  request: MessageStreamRequest,
  callbacks: StreamCallbacks
): Promise<void> {
  const response = await apiClient.post(
    `/chats/${chatId}/stream`,
    request,
    {
      timeout: 0,  // Pas de timeout pour SSE
      responseType: 'stream',
      headers: { Accept: 'text/event-stream' },
      adapter: 'fetch',  // Important pour streaming
    }
  );

  // Parser SSE
  const reader = response.data
    .pipeThrough(new TextDecoderStream())
    .getReader();

  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += value;
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const eventBlock of events) {
      if (!eventBlock.trim()) continue;

      // Parser event: <type> \n data: <json>
      const lines = eventBlock.split('\n');
      const eventType = lines.find(l => l.startsWith('event:'))
        ?.replace('event:', '').trim();
      const dataStr = lines.find(l => l.startsWith('data:'))
        ?.replace('data:', '').trim();

      if (!eventType || !dataStr) continue;

      const data = JSON.parse(dataStr);

      // Dispatcher
      switch (eventType) {
        case 'chunk':
          callbacks.onChunk(data.content);
          break;
        case 'sources':
          callbacks.onSources(data.sources);
          break;
        case 'tool_call_created':
          callbacks.onRefetchMessages();
          break;
        case 'done':
          callbacks.onDone();
          return;
        case 'error':
          callbacks.onError(data.message);
          return;
      }
    }
  }
}
```

### Hook React Query
```typescript
export function useStreamMessage(chatId: string | null) {
  const queryClient = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');

  const streamMessage = useCallback(async (message: string, agentId: string) => {
    if (!chatId) return;

    setIsStreaming(true);
    setStreamingMessage('');

    try {
      await chatService.streamMessage(chatId, { message, agent_id: agentId }, {
        onChunk: (content) => {
          setStreamingMessage(prev => prev + content);
        },
        onDone: () => {
          setIsStreaming(false);
          setStreamingMessage('');
          queryClient.invalidateQueries(['messages', chatId]);
        },
        onError: (error) => {
          toast.error(error);
          setIsStreaming(false);
        },
      });
    } catch (error) {
      setIsStreaming(false);
      throw error;
    }
  }, [chatId, queryClient]);

  return { streamMessage, isStreaming, streamingMessage };
}
```

## Gestion des états

### Backend : StreamManager
```python
@dataclass
class StreamSession:
    chat_id: str
    user_id: str
    started_at: datetime
    stop_event: asyncio.Event = field(default_factory=asyncio.Event)
    is_active: bool = True

class StreamManager:
    def __init__(self):
        self.active_sessions: Dict[str, StreamSession] = {}

    def start_session(self, chat_id: str, user_id: str) -> StreamSession:
        session = StreamSession(
            chat_id=chat_id,
            user_id=user_id,
            started_at=datetime.now()
        )
        self.active_sessions[chat_id] = session
        return session

    def stop_stream(self, chat_id: str) -> bool:
        session = self.active_sessions.get(chat_id)
        if not session:
            return False
        session.stop_event.set()
        return True

    def end_session(self, chat_id: str):
        self.active_sessions.pop(chat_id, None)
```

### Frontend : React State
```typescript
interface ChatContextState {
  isSending: boolean;      // Message envoyé, pas encore de stream
  streaming: boolean;      // Stream actif
  streamingMessage: string; // Buffer texte en cours
  sources: Source[];       // Sources RAG accumulées
  pendingValidation: string | null; // ID validation en attente
}
```

## Patterns d'arrêt du stream

### 1. Arrêt utilisateur (bouton Stop)
```typescript
// Frontend
const handleStop = async () => {
  await chatService.stopStream(chatId);
};

// Backend
@router.post("/{chat_id}/stop")
async def stop_chat(chat_id: str, current_user: User = Depends(...)):
    stream_manager.stop_stream(chat_id)  # Set stop_event
    await crud_chats.update_chat_generating_status(chat_id, False)
    return None
```

### 2. Timeout d'inactivité (frontend)
```typescript
let lastActivityTime = Date.now();
const INACTIVITY_TIMEOUT = 300000; // 5 minutes

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const timeSinceLastActivity = Date.now() - lastActivityTime;
  if (timeSinceLastActivity > INACTIVITY_TIMEOUT) {
    throw new Error('Stream inactivity timeout');
  }

  lastActivityTime = Date.now();
  // ... traiter value
}
```

### 3. Erreur LLM Provider
```python
try:
    async for chunk in llm_gateway.stream(...):
        yield sse_event("chunk", {"content": chunk})
except Exception as e:
    yield sse_event("error", {"message": str(e)})
    # Log pour observabilité
    logger.exception(f"LLM stream error: {e}")
```

## Bonnes pratiques

### ✅ À faire
1. **Headers corrects**
   ```python
   headers={
       "Cache-Control": "no-cache",
       "Connection": "keep-alive",
       "X-Accel-Buffering": "no",  # Nginx
   }
   ```

2. **Cleanup dans finally**
   ```python
   try:
       async for chunk in stream:
           yield chunk
   finally:
       stream_manager.end_session(chat_id)
       await crud.update_generating_status(chat_id, False)
   ```

3. **Check stop à chaque chunk**
   ```python
   async for chunk in stream:
       if session.stop_event.is_set():
           yield sse_event("stopped", {...})
           break
   ```

4. **Logs structurés**
   ```python
   logger.info(f"Stream started: chat={chat_id}, user={user_id}")
   logger.info(f"Stream ended: chat={chat_id}, duration={duration}s")
   ```

### ❌ À éviter
1. **Pas de timeout côté serveur** : Le stream peut durer plusieurs minutes
2. **Buffering activé** : Désactiver sur Nginx/Apache (X-Accel-Buffering)
3. **Pas de cleanup** : Toujours end_session() dans finally
4. **Oublier stop_event** : Vérifier à chaque chunk pour réactivité

---

**Prochaine section** : [Timeouts et Heartbeats](timeouts-heartbeats.md)
