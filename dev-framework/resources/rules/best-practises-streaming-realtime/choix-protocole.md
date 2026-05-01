# Choix du Protocole : SSE vs WebSocket

## Matrice de décision

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARBRE DE DÉCISION                            │
└─────────────────────────────────────────────────────────────────┘

Avez-vous besoin d'envoyer des données CLIENT → SERVEUR ?
│
├─ NON ──────────────────────────────────────────► SSE ✅
│                                                   (90% des cas)
│
└─ OUI
   │
   └─ Fréquemment (>1/min) ou en temps réel ?
      │
      ├─ OUI ──────────────────────────────────► WebSocket ✅
      │                                           (chat, gaming)
      │
      └─ NON ──────────────────────────────────► SSE + REST ✅
                                                  (streaming + actions)
```

## Comparaison détaillée

### Server-Sent Events (SSE)

#### ✅ Avantages
- **Simplicité** : HTTP standard, pas de handshake complexe
- **Reconnexion automatique** : Intégré au protocole (EventSource API)
- **HTTP/2 compatible** : Multiplexing natif (jusqu'à 100 streams)
- **Proxy-friendly** : Fonctionne avec la plupart des infrastructures
- **Sécurité** : Réutilise les mécanismes HTTP (HTTPS, cookies, CORS)
- **Debugging** : Visible dans les DevTools navigateur

#### ❌ Limitations
- **Unidirectionnel** : Serveur → Client uniquement
- **Texte seulement** : Pas de binaire (base64 possible)
- **HTTP/1.1** : Limite de 6 connexions par domaine (résolu avec HTTP/2)
- **Pas de compression frame-level** : Compression HTTP seulement

#### 📝 Use cases idéaux
- Streaming LLM (OpenAI, Anthropic, Google)
- Notifications push
- Feeds d'activité temps réel
- Dashboards de monitoring
- Mises à jour de statut

#### Code exemple (Frontend)
```typescript
const eventSource = new EventSource('/api/stream');

eventSource.addEventListener('message', (event) => {
  console.log('Received:', event.data);
});

eventSource.addEventListener('error', (error) => {
  console.error('SSE error:', error);
  // Reconnexion automatique
});
```

### WebSockets

#### ✅ Avantages
- **Bidirectionnel** : Communication full-duplex
- **Binaire natif** : Supporte ArrayBuffer, Blob
- **Latence ultra-faible** : 2 bytes d'overhead par frame
- **Extensions** : Compression per-message (permessage-deflate)
- **Control frames** : Ping/pong intégrés

#### ❌ Limitations
- **Complexité** : Handshake, gestion des états, reconnexion manuelle
- **Proxy issues** : Certains proxies bloquent ou timeout
- **Sécurité** : Nécessite gestion explicite (CSRF, Origin validation)
- **Debugging** : Moins évident que HTTP (outils spécialisés requis)
- **Overhead initial** : Handshake HTTP → WS upgrade

#### 📝 Use cases idéaux
- Chat en temps réel
- Gaming multijoueur
- Édition collaborative (Google Docs-like)
- Trading platforms
- Vidéo/audio streaming signaling

#### Code exemple (Frontend)
```typescript
const ws = new WebSocket('wss://api.example.com/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({ type: 'subscribe', channel: 'updates' }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  // Reconnexion manuelle nécessaire
  setTimeout(() => reconnect(), 3000);
};
```

## Benchmark de performance (2024)

| Métrique | SSE | WebSocket | Diff |
|----------|-----|-----------|------|
| **Latency (median)** | ~5ms | ~4ms | +20% |
| **Throughput (msg/s)** | ~45k | ~50k | +11% |
| **Overhead par message** | ~5 bytes | ~2 bytes | +150% |
| **CPU usage** | Similaire | Similaire | ~0% |
| **Memory usage** | Similaire | Similaire | ~0% |

**Conclusion** : Différence négligeable pour la plupart des applications. Le choix doit être dicté par les besoins fonctionnels, pas les performances.

## Patterns d'architecture

### Pattern 1 : SSE pur (recommandé pour LLM)
```
Client ──────SSE────────> Server (stream continu)
Client ──────REST──────> Server (actions ponctuelles)
```

**Avantages** :
- Simplicité maximale
- Séparation claire stream vs actions
- Facile à scaler (stateless REST)

**Exemple** :
- Stream : `GET /chats/{id}/stream` (SSE)
- Actions : `POST /chats/{id}/stop` (REST)

### Pattern 2 : WebSocket pur
```
Client <────WS────> Server (bidirectionnel)
```

**Avantages** :
- Une seule connexion
- Latence minimale

**Inconvénients** :
- Gestion des états complexe
- Scaling plus difficile (stateful)

### Pattern 3 : Hybride (over-engineering ⚠️)
```
Client ──────SSE────────> Server (notifications)
Client <────WS────> Server (actions temps réel)
```

**Éviter sauf besoin très spécifique**. Ajoute de la complexité sans gain significatif.

## Cas spécifiques : Streaming LLM

### Pourquoi SSE est le standard ?

**OpenAI, Anthropic, Google** utilisent tous SSE pour le streaming car :

1. **Unidirectionnel suffit** : LLM génère, client affiche
2. **Reconnexion critique** : Pertes réseau fréquentes (mobiles)
3. **Infrastructure simple** : Pas de gestion d'états WebSocket
4. **Debugging facile** : DevTools montrent les events
5. **Scalabilité** : Load balancer HTTP standard

### Format SSE pour LLM
```
event: chunk
data: {"content": "Hello"}

event: chunk
data: {"content": " world"}

event: sources
data: {"sources": [{"id": "doc1", "score": 0.95}]}

event: done
data: {}
```

## Checklist de décision

### Choisir SSE si :
- ✅ Flux unidirectionnel (serveur → client)
- ✅ Reconnexion automatique importante
- ✅ Infrastructure HTTP/REST existante
- ✅ Simplicité prioritaire
- ✅ Streaming LLM, notifications, monitoring

### Choisir WebSocket si :
- ✅ Communication bidirectionnelle fréquente
- ✅ Latence ultra-faible critique (<5ms)
- ✅ Données binaires volumineuses
- ✅ Chat, gaming, édition collaborative
- ✅ Équipe expérimentée WebSocket

### Choisir Long Polling si :
- ⚠️ Fallback pour navigateurs très anciens
- ⚠️ Infrastructure ne supporte pas SSE/WS
- ⚠️ Éviter si possible (overhead élevé)

## Erreurs courantes

### ❌ Utiliser WebSocket "par défaut"
**Problème** : Complexité inutile pour des besoins simples
**Solution** : Commencer avec SSE, migrer si besoin prouvé

### ❌ Ignorer HTTP/2 pour SSE
**Problème** : Limite de 6 connexions devient bloquante
**Solution** : Activer HTTP/2 sur le serveur (Nginx, Uvicorn)

### ❌ Pas de stratégie de reconnexion
**Problème** : Expérience utilisateur dégradée
**Solution** : EventSource (SSE) le gère automatiquement

### ❌ Mixing concerns
**Problème** : Utiliser WS pour du REST-like (request/response)
**Solution** : REST pour actions, SSE/WS pour push temps réel

## Recommandation finale

```
┌─────────────────────────────────────────────────────────────────┐
│  RÈGLE D'OR 2024-2025                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Default to SSE                                                  │
│  Upgrade to WebSocket only when bidirectional is critical       │
│                                                                  │
│  Ratio observé : 90% SSE, 10% WebSocket                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

**Prochaine section** : [Architecture SSE en Production](architecture-sse.md)
