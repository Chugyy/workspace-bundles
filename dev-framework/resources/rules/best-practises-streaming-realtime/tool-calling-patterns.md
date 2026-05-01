# Tool Calling et LLM Streaming

## Concepts

Le **tool calling** (ou function calling) permet aux LLMs d'interagir avec le monde extérieur :
- Rechercher dans des bases de données
- Appeler des APIs externes
- Effectuer des calculs complexes
- Exécuter des actions (envoi email, création ressource)

## Architecture agentic

```
┌──────────────────────────────────────────────────────────────────┐
│                      BOUCLE ITERATIVE                            │
└──────────────────────────────────────────────────────────────────┘

1. User envoie message
   ↓
2. LLM génère réponse + tool calls
   ↓
3. ┌─ Texte? ──> Stream au frontend
   └─ Tool call? ──> Exécuter tool
   ↓
4. Résultat tool ajouté au contexte
   ↓
5. LLM continue avec nouveau contexte
   ↓
6. Répéter jusqu'à : pas de tool call OU max iterations

Limites de sécurité:
- max_iterations: 25 (éviter boucles infinies)
- max_consecutive_errors: 5 (arrêt si échecs répétés)
```

## Patterns d'exécution

### Pattern 1 : Auto-approved (recommandé)
```python
async def stream_with_tools(...):
    """Exécution automatique des tools sans validation humaine"""

    while iteration < max_iterations:
        tool_calls_detected = []

        # Stream LLM
        async for chunk in adapter.stream_with_tools(...):
            if isinstance(chunk, str):
                yield chunk
            elif isinstance(chunk, ToolCall):
                tool_calls_detected.append(chunk)

        if not tool_calls_detected:
            break  # Fin

        # Exécuter les tools directement
        for tool_call in tool_calls_detected:
            result = await execute_tool(
                tool_name=tool_call.name,
                arguments=tool_call.arguments
            )

            # Créer message tool_call visible UI
            await crud.create_message(
                chat_id=chat_id,
                role="tool_call",
                content=f"Utilisation de l'outil : {tool_call.name}",
                metadata={
                    "step": "completed",
                    "tool_name": tool_call.name,
                    "arguments": tool_call.arguments,
                    "result": result
                }
            )

            # Notifier frontend
            yield f"[TOOL_CALL_CREATED:{message_id}]"

        # Continuer le stream avec résultats
        iteration += 1
```

**Avantages** :
- Rapide : pas de latence humaine
- Simple : pas de gestion d'états complexe
- UX fluide : streaming sans interruption

**Inconvénients** :
- Pas de contrôle sur actions sensibles
- Risque d'abus si prompt injection

### Pattern 2 : Human-in-the-loop
```python
async def stream_with_tools(...):
    """Validation humaine pour certains tools"""

    while iteration < max_iterations:
        tool_calls_detected = []

        async for chunk in adapter.stream_with_tools(...):
            if isinstance(chunk, str):
                yield chunk
            elif isinstance(chunk, ToolCall):
                tool_calls_detected.append(chunk)

        if not tool_calls_detected:
            break

        for tool_call in tool_calls_detected:
            tool_def = get_tool_definition(tool_call.name)

            if tool_def.requires_approval:
                # Créer validation en DB
                validation_id = await crud.create_validation(
                    user_id=user_id,
                    chat_id=chat_id,
                    tool_name=tool_call.name,
                    arguments=tool_call.arguments
                )

                # Notifier frontend
                yield f"[VALIDATION_REQUIRED:{validation_id}]"

                # Attendre approval (polling ou webhook)
                max_wait = 300  # 5 minutes
                while max_wait > 0:
                    if session.stop_event.is_set():
                        await crud.cancel_validation(validation_id)
                        return

                    validation = await crud.get_validation(validation_id)
                    if validation.status == "approved":
                        result = await execute_tool(...)
                        break
                    elif validation.status == "rejected":
                        result = {"error": "Rejected by user"}
                        break

                    await asyncio.sleep(1)
                    max_wait -= 1
            else:
                # Exécution directe
                result = await execute_tool(...)

            yield f"[TOOL_CALL_UPDATED:{message_id}]"

        iteration += 1
```

**Avantages** :
- Sécurité : contrôle humain sur actions sensibles
- Traçabilité : historique des validations
- Flexibilité : règles "always allow" possibles

**Inconvénients** :
- Latence : attente humaine (jusqu'à 5 minutes)
- Complexité : gestion états validation
- UX dégradée : interruption du flow

### Pattern 3 : Hybrid (recommandé production)
```yaml
# config/agents/tools/search.yaml
name: search_knowledge_base
requires_approval: false

# config/agents/tools/delete.yaml
name: delete_resource
requires_approval: true
approval_message: "Êtes-vous sûr de vouloir supprimer {{resource_name}} ?"
```

**Règle** : Auto-approve par défaut, human-in-the-loop pour actions destructives/coûteuses.

## Adaptive Streaming Pattern

### Problème
Pendant les tool calls, le LLM génère du texte JSON peu utile pour l'utilisateur :
```json
{"tool": "search", "arguments": {"query": "..."}}
```

### Solution
Buffer le texte pendant les tool calls, ne streamer que le résultat final :

```python
async def stream_with_tools(..., adaptive_streaming=True):
    while iteration < max_iterations:
        tool_calls_detected = []
        text_buffer = ""

        async for chunk in adapter.stream_with_tools(...):
            if isinstance(chunk, str):
                if adaptive_streaming:
                    text_buffer += chunk  # Buffer
                else:
                    yield chunk  # Stream immédiat
            elif isinstance(chunk, ToolCall):
                tool_calls_detected.append(chunk)

        if not tool_calls_detected:
            # Fin : yield le buffer accumulé
            if adaptive_streaming and text_buffer:
                yield text_buffer
            break

        # Tool calls détectés : exécuter (pas de yield du buffer)
        # Option : yield le "thinking" avant tool call
        if text_buffer and should_show_thinking:
            yield text_buffer

        text_buffer = ""  # Reset

        # ... exécuter tools ...
```

**Impact UX** :
- Moins de chunks parasites (JSON)
- Affichage plus propre
- Léger délai si beaucoup de tool calls

## Gestion des erreurs

### Types d'erreurs tool
```python
@dataclass
class ToolResult:
    tool_call_id: str
    content: str
    is_error: bool

# Erreur paramètre manquant
ToolResult(
    tool_call_id="abc",
    content=json.dumps({
        "error": "Missing required parameter: resource_id"
    }),
    is_error=True
)

# Erreur validation
ToolResult(
    tool_call_id="def",
    content=json.dumps({
        "error": "Invalid resource_id: must be UUID format"
    }),
    is_error=True
)

# Erreur technique
ToolResult(
    tool_call_id="ghi",
    content=json.dumps({
        "error": "Database connection timeout"
    }),
    is_error=True
)
```

### Enrichissement erreurs pour LLM
```python
if result["success"]:
    tool_results.append(ToolResult(
        tool_call_id=tool_call.id,
        content=json.dumps(result["result"]),
        is_error=False
    ))
else:
    error_msg = result['error']
    remaining = max_consecutive_errors - consecutive_errors - 1

    # Format enrichi pour aider le LLM
    enriched_error = f"""TOOL EXECUTION ERROR

Tool: {tool_call.name}
Error: {error_msg}

ANALYSIS:
- If "Missing required parameter": Check conversation history and retry with correct value
- If "Invalid parameter": Review tool schema and retry with valid format
- If technical error (connection, timeout): Inform user and suggest alternatives

You have {remaining} consecutive error(s) remaining before stopping."""

    tool_results.append(ToolResult(
        tool_call_id=tool_call.id,
        content=enriched_error,
        is_error=True
    ))
```

### Compteur d'erreurs consécutives
```python
consecutive_errors = 0
max_consecutive_errors = 5

while iteration < max_iterations:
    # ... stream + tool execution ...

    has_errors = any(tr.is_error for tr in tool_results)

    if has_errors:
        consecutive_errors += 1
        if consecutive_errors >= max_consecutive_errors:
            logger.warning("Max consecutive errors reached, stopping")
            break
    else:
        consecutive_errors = 0  # Reset sur succès
```

**Rationale** : Permettre au LLM de corriger ses erreurs, mais éviter les boucles infinies.

## Messages tool_call visibles UI

### Metadata recommandée
```python
metadata = {
    "step": "executing",  # ou "completed", "failed", "validation_requested"
    "tool_call_id": "abc123",
    "tool_name": "search_knowledge_base",
    "arguments": {"query": "Python async"},
    "status": "executing",
    "auto_approved": True,  # Ou False si human-in-the-loop
    "history": [
        {
            "step": "executing",
            "timestamp": "2024-01-15T10:30:00Z",
            "status": "auto_approved"
        },
        {
            "step": "completed",
            "timestamp": "2024-01-15T10:30:02Z",
            "result": {"count": 5, "top_result": "..."}
        }
    ]
}
```

### UI Component (React)
```tsx
export function ToolCallCard({ metadata, onApprove, onReject }) {
  const { tool_name, arguments, status, result } = metadata;

  if (status === 'executing') {
    return (
      <div className="border rounded p-3 bg-blue-50">
        <Loader /> Exécution de {tool_name}...
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="border rounded p-3 bg-green-50">
        ✅ {tool_name} terminé
        <details>
          <summary>Résultat</summary>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </details>
      </div>
    );
  }

  if (status === 'validation_requested') {
    return (
      <div className="border rounded p-3 bg-yellow-50">
        ⚠️ Validation requise : {tool_name}
        <div className="mt-2 flex gap-2">
          <Button onClick={() => onApprove(metadata.validation_id)}>
            Approuver
          </Button>
          <Button variant="destructive" onClick={() => onReject(metadata.validation_id)}>
            Rejeter
          </Button>
        </div>
      </div>
    );
  }
}
```

## Ordonnancement des messages

### Problème
Garantir l'ordre correct des messages dans un tour de conversation :
```
[user] "Hello"
[assistant] "Let me search..."  (pré tool call)
[tool_call] search(...)
[assistant] "I found..."  (post tool call)
```

### Solution : turn_id + sequence_index
```python
turn_id = str(uuid.uuid4())
session.sequence_index = 0

# Message assistant pré-tool
await crud.create_message(
    chat_id=chat_id,
    role="assistant",
    content=buffer_text,
    turn_id=turn_id,
    sequence_index=session.sequence_index
)
session.sequence_index += 1

# Message tool_call
await crud.create_message(
    chat_id=chat_id,
    role="tool_call",
    content="...",
    turn_id=turn_id,
    sequence_index=session.sequence_index
)
session.sequence_index += 1

# Message assistant post-tool
await crud.create_message(
    chat_id=chat_id,
    role="assistant",
    content=final_text,
    turn_id=turn_id,
    sequence_index=session.sequence_index
)
```

### Tri côté frontend
```typescript
messages.sort((a, b) => {
  // Si même turn, trier par sequence_index
  if (a.turn_id && b.turn_id && a.turn_id === b.turn_id) {
    return (a.sequence_index || 0) - (b.sequence_index || 0);
  }
  // Sinon, trier par created_at
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
});
```

## Checklist tool calling

### Backend
- [ ] Boucle itérative avec max_iterations (25 recommandé)
- [ ] Compteur d'erreurs consécutives (5 recommandé)
- [ ] Enrichissement erreurs pour aider LLM
- [ ] Messages tool_call visibles UI
- [ ] Metadata complète (step, status, arguments, result)
- [ ] Events SSE pour notifier frontend (tool_call_created/updated)
- [ ] Ordonnancement correct (turn_id + sequence_index)

### Frontend
- [ ] UI component pour tool calls
- [ ] Refetch messages sur tool_call_created/updated
- [ ] Affichage loader pendant exécution
- [ ] Affichage résultat (collapsible)
- [ ] UI approval si human-in-the-loop

### Sécurité
- [ ] Validation inputs avant exécution
- [ ] Rate limiting sur tools coûteux
- [ ] Logs exhaustifs (audit trail)
- [ ] Flag requires_approval pour tools sensibles

---

**Prochaine section** : [HTTP/2 et Scalabilité](http2-scalabilite.md)
