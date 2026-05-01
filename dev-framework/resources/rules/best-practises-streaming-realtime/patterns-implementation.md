# Patterns d'Implémentation

## Pattern : Producer-Consumer avec Queue

### Problème
Un générateur async ne peut pas yield depuis plusieurs sources simultanées (heartbeat + stream LLM).

### Solution
Utiliser une queue pour multiplexer les événements.

```python
async def generate():
    event_queue = asyncio.Queue()

    async def heartbeat_producer():
        while not stop_event.is_set():
            await asyncio.sleep(15)
            await event_queue.put(("heartbeat", None))

    async def stream_producer():
        async for chunk in llm_gateway.stream(...):
            await event_queue.put(("chunk", chunk))
        await event_queue.put(("done", None))

    # Démarrer producers
    heartbeat_task = asyncio.create_task(heartbeat_producer())
    stream_task = asyncio.create_task(stream_producer())

    try:
        # Consumer
        while True:
            event_type, data = await event_queue.get()

            if event_type == "heartbeat":
                yield ": keep-alive\n\n"
            elif event_type == "chunk":
                yield sse_event("chunk", {"content": data})
            elif event_type == "done":
                yield sse_event("done", {})
                break
    finally:
        heartbeat_task.cancel()
        stream_task.cancel()
        await asyncio.gather(heartbeat_task, stream_task, return_exceptions=True)
```

**Avantages** :
- Séparation des concerns
- Facile à tester
- Extensible (ajouter d'autres producers)

## Pattern : Session Manager

### Problème
Gérer les sessions de streaming actives (start/stop/cleanup).

### Solution
Singleton global avec dict de sessions.

```python
@dataclass
class StreamSession:
    chat_id: str
    user_id: str
    started_at: datetime
    stop_event: asyncio.Event = field(default_factory=asyncio.Event)
    is_active: bool = True
    sequence_index: int = 0  # Pour ordonnancement messages

class StreamManager:
    def __init__(self):
        self.active_sessions: Dict[str, StreamSession] = {}

    def start_session(self, chat_id: str, user_id: str) -> StreamSession:
        if chat_id in self.active_sessions:
            logger.warning(f"Session exists for {chat_id}, replacing")
            self.end_session(chat_id)

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
        session = self.active_sessions.pop(chat_id, None)
        if session:
            session.is_active = False
            duration = (datetime.now() - session.started_at).total_seconds()
            logger.info(f"Session {chat_id} ended after {duration}s")

# Instance globale
stream_manager = StreamManager()
```

**Avantages** :
- Centralisé
- Facile à monitorer (nombre de sessions actives)
- Cleanup automatisable

## Pattern : Gateway LLM

### Problème
Abstraire les différences entre providers LLM (OpenAI, Anthropic, Google).

### Solution
Gateway avec adapters par provider.

```python
class LLMGateway:
    def __init__(self):
        self.adapters = {
            "openai": OpenAIAdapter(),
            "anthropic": AnthropicAdapter(),
        }
        self.circuit_breakers = {
            "openai": CircuitBreaker("openai"),
            "anthropic": CircuitBreaker("anthropic"),
        }

    async def stream(
        self,
        messages: List[Dict],
        model: str,
        system_prompt: str | None = None,
        **params
    ) -> AsyncGenerator[str, None]:
        # Router vers le bon provider
        provider = self.get_provider_from_model(model)
        adapter = self.adapters[provider]

        # Transformer paramètres
        adapted_params = self.transform_params(provider, params)

        # Stream avec circuit breaker
        async for chunk in self.circuit_breakers[provider].call(
            adapter.stream,
            messages,
            model,
            system_prompt,
            **adapted_params
        ):
            yield chunk

    def get_provider_from_model(self, model: str) -> str:
        if model.startswith("gpt"):
            return "openai"
        elif model.startswith("claude"):
            return "anthropic"
        raise ValueError(f"Unknown model: {model}")

# Instance globale
llm_gateway = LLMGateway()
```

**Avantages** :
- Abstraction des providers
- Fallback facile à implémenter
- Circuit breaker centralisé

## Pattern : React Query pour Streaming

### Problème
Gérer l'état du streaming côté React (isStreaming, buffer, sources).

### Solution
Hook custom avec React Query pour cache management.

```typescript
export function useStreamMessage(chatId: string | null) {
  const queryClient = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [sources, setSources] = useState<Source[]>([]);

  const streamMessage = useCallback(
    async (message: string, agentId: string) => {
      if (!chatId) return;

      setIsStreaming(true);
      setStreamingMessage('');
      setSources([]);

      try {
        await chatService.streamMessage(chatId, { message, agent_id: agentId }, {
          onChunk: (content) => {
            setStreamingMessage((prev) => prev + content);
          },
          onSources: (newSources) => {
            setSources(newSources);
          },
          onDone: () => {
            setIsStreaming(false);
            setStreamingMessage('');
            setSources([]);
            // Invalider cache pour refetch
            queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
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
    },
    [chatId, queryClient]
  );

  return { streamMessage, isStreaming, streamingMessage, sources };
}
```

**Avantages** :
- Séparation logique (hook) vs présentation (composant)
- Réutilisable
- Intégration React Query pour cache

## Pattern : Message Optimiste

### Problème
Feedback instantané avant que le stream ne démarre.

### Solution
Afficher un message "optimiste" immédiatement, le retirer quand le message réel arrive.

```typescript
const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }) {
  const [optimisticUserMessage, setOptimisticUserMessage] = useState<Message | null>(null);
  const { data: messages = [] } = useMessages(activeChatId);

  // Fusionner messages réels + optimiste
  const allMessages = optimisticUserMessage
    ? (() => {
        const realExists = messages.some(
          m => m.role === 'user' && m.content === optimisticUserMessage.content
        );
        return realExists ? messages : [...messages, optimisticUserMessage];
      })()
    : messages;

  const sendMessage = useCallback(async (content: string, agentId: string) => {
    // Créer message optimiste
    const tempMessage: Message = {
      id: `temp_${Date.now()}`,
      chat_id: activeChatId!,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setOptimisticUserMessage(tempMessage);

    try {
      await streamMessage(content, null, agentId);
    } finally {
      setOptimisticUserMessage(null);
    }
  }, [activeChatId, streamMessage]);

  return (
    <ChatContext.Provider value={{ messages: allMessages, sendMessage, ... }}>
      {children}
    </ChatContext.Provider>
  );
}
```

**Avantages** :
- UX réactive (feedback < 100ms)
- Pas de flash de contenu (message apparaît immédiatement)

## Pattern : Event-driven UI Updates

### Problème
Mettre à jour l'UI quand des événements SSE arrivent (tool_call_created, tool_call_updated).

### Solution
Invalider le cache React Query pour refetch automatiquement.

```typescript
// Dans le parser SSE
switch (eventType) {
  case 'tool_call_created':
  case 'tool_call_updated':
    // Invalider cache → refetch messages
    callbacks.onRefetchMessages();
    break;
}

// Hook
const streamMessage = useCallback(async (...) => {
  await chatService.streamMessage(chatId, request, {
    // ...
    onRefetchMessages: () => {
      queryClient.invalidateQueries({
        queryKey: ['messages', chatId],
      });
    },
  });
}, [chatId, queryClient]);
```

**Avantages** :
- Déclaratif (React Query gère le refetch)
- Évite les race conditions
- UI toujours synchronisée avec le backend

## Pattern : Conflict Resolution (409)

### Problème
Utilisateur envoie un second message pendant qu'une génération est en cours.

### Solution
Backend retourne 409 Conflict, frontend affiche une modale.

```typescript
// Backend
@router.post("/{chat_id}/stream")
async def stream_message(...):
    is_generating = await crud_chats.is_chat_generating(chat_id)
    if is_generating:
        raise ConflictError("Generation already in progress")

    await crud_chats.update_chat_generating_status(chat_id, True)
    # ... stream ...

// Frontend
const handleSubmit = async () => {
  try {
    await sendMessage(input.trim(), null, selectedAgent);
  } catch (error: any) {
    const isConflict = error.response?.status === 409;
    if (isConflict) {
      setConflictDialog({
        open: true,
        pendingMessage: input,
        pendingAgent: selectedAgent
      });
    }
  }
};

const handleCancelAndRetry = async () => {
  await stopStream();  // Force stop
  await new Promise(resolve => setTimeout(resolve, 500));
  await sendMessage(conflictDialog.pendingMessage, null, conflictDialog.pendingAgent);
  setConflictDialog({ open: false, ... });
};
```

**Avantages** :
- Évite les double-streams
- Donne contrôle à l'utilisateur (attendre ou annuler)

## Pattern : Turn-based Message Ordering

### Problème
Garantir l'ordre correct des messages dans un tour de conversation multi-étapes.

### Solution
turn_id + sequence_index.

```python
# Backend
turn_id = str(uuid.uuid4())
session.sequence_index = 0

# Message 1 : assistant pré-tool
await crud.create_message(
    ...,
    turn_id=turn_id,
    sequence_index=session.sequence_index
)
session.sequence_index += 1

# Message 2 : tool_call
await crud.create_message(
    ...,
    turn_id=turn_id,
    sequence_index=session.sequence_index
)
session.sequence_index += 1

# Frontend : tri
messages.sort((a, b) => {
  if (a.turn_id === b.turn_id) {
    return (a.sequence_index || 0) - (b.sequence_index || 0);
  }
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
});
```

**Avantages** :
- Ordre garanti même avec latences variables
- Fonctionne avec plusieurs tool calls dans un turn

## Checklist patterns

### Backend
- [ ] Producer-Consumer avec Queue (heartbeat + stream)
- [ ] Session Manager global
- [ ] Gateway LLM avec adapters
- [ ] Conflict resolution (409)
- [ ] Turn-based ordering (turn_id + sequence_index)

### Frontend
- [ ] Hook React Query pour streaming
- [ ] Message optimiste
- [ ] Event-driven UI updates (invalidate cache)
- [ ] Conflict dialog (cancel & retry)
- [ ] Message sorting (turn-based)

---

**Prochaine section** : [Erreurs Courantes à Éviter](erreurs-courantes.md)
