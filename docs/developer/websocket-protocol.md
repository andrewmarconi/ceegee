# WebSocket Protocol

CeeGee uses WebSockets for real-time state synchronization between the engine, control UIs, and overlay outputs.

## Endpoint

```
ws://localhost:3000/ws
```

Implemented in `apps/engine-ui/server/routes/ws.ts` using Nitro's built-in WebSocket support (enabled via `experimental.websocket: true` in `nuxt.config.ts`).

## Connection lifecycle

### 1. Client connects

The client opens a WebSocket connection to `/ws`. No authentication is required (MVP runs on a trusted network).

### 2. Client subscribes

After connecting, the client sends a subscribe message:

```json
{
  "type": "subscribe",
  "workspaceId": 1,
  "channelId": 1
}
```

The server registers this peer in the connection map (keyed by workspace + channel) and responds with a `state:init` event containing the full current channel state.

### 3. Server pushes updates

When engine control actions occur (take, clear, action), the server broadcasts a `state:update` event to all peers subscribed to that workspace + channel.

### 4. Client disconnects

On disconnect, the server removes the peer from the connection map.

## Event types

All events follow the `EngineEvent` union type:

### state:init

Sent once after a client subscribes. Contains the full channel state.

```json
{
  "type": "state:init",
  "payload": {
    "workspaceId": 1,
    "channelId": 1,
    "layers": [
      {
        "layerId": 1,
        "elements": [
          {
            "elementId": 1,
            "visibility": "visible",
            "runtimeData": {},
            "updatedAt": "2026-03-28T00:00:00.000Z"
          }
        ]
      }
    ]
  }
}
```

### state:update

Sent whenever channel state changes (after take, clear, or action). **Full replacement semantics** -- clients replace their local state entirely, no merge logic needed.

```json
{
  "type": "state:update",
  "payload": {
    "workspaceId": 1,
    "channelId": 1,
    "layers": [...]
  }
}
```

### element:action

Broadcast when a module-specific action is triggered (e.g., start a countdown, emphasize a lower third).

```json
{
  "type": "element:action",
  "payload": {
    "workspaceId": 1,
    "channelId": 1,
    "elementId": 5,
    "actionId": "start",
    "args": null
  }
}
```

### telemetry

Optional diagnostic data. Reserved for future use.

```json
{
  "type": "telemetry",
  "payload": {}
}
```

## State model

### ChannelState

The top-level state object for a channel:

```ts
type ChannelState = {
  workspaceId: number;
  channelId: number;
  layers: LayerState[];
};
```

### LayerState

State for a single layer:

```ts
type LayerState = {
  layerId: number;
  elements: ElementRuntimeState[];
};
```

### ElementRuntimeState

Per-element runtime state:

```ts
type ElementRuntimeState = {
  elementId: number;
  visibility: 'hidden' | 'entering' | 'visible' | 'exiting';
  runtimeData?: unknown;
  updatedAt: string;
};
```

## Client implementation

The `useEngineWs` composable (`app/composables/useEngineWs.ts`) handles:

- Connection management with auto-reconnect (2-second timeout).
- Sending the subscribe message after connection.
- Parsing incoming events and updating reactive `channelState`.
- Exposing connection `status` (`connecting`, `connected`, `disconnected`).

## Server implementation

### Connection tracking

`server/utils/ws-connections.ts` maintains a `Map<peerId, { peer, workspaceId, channelId }>`.

- `addWsConnection(peer, workspaceId, channelId)` -- registers a peer.
- `removeWsConnection(peer)` -- removes a peer.
- `broadcastToChannel(workspaceId, channelId, event)` -- sends an event to all peers subscribed to a given workspace + channel.

### Broadcast flow

When an API route mutates state:

1. The route calls `take(db, elementId)` / `clear(db, elementId)` / `elementAction(db, ...)`.
2. The function returns the updated `ChannelState` or `EngineEvent`.
3. The route calls `broadcastToChannel(workspaceId, channelId, event)`.
4. All subscribed clients receive the update.
