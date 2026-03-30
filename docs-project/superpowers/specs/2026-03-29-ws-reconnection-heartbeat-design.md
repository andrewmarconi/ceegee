# WebSocket Reconnection and Heartbeat Design

**Issue:** #11
**Date:** 2026-03-29

## Goal

Add server-initiated heartbeat detection and improved connection status visibility to the Operator UI, so operators always know the health of their server connection at a glance.

## Design Decisions

- **Server-initiated WebSocket protocol-level pings** — no custom heartbeat messages
- **Four connection states** — `connected`, `connecting`, `reconnecting`, `disconnected`
- **Traffic light dot** replaces the current text-based WS status Tag in the TopBar
- **On Air / Off Air badge is unchanged** — separate concern from connection health
- **Reconnection timing unchanged** — 2-second fixed delay (backoff is out of scope)

## Connection Status Indicator

A single colored dot (~8px circle) in the TopBar, replacing the current WS status `<Tag>`. Tooltip provides the text label.

| State | Color | Animation | Tooltip |
|-------|-------|-----------|---------|
| `connected` | `green-500` | Slow pulse (~2s cycle) | "Connected to Server" |
| `connecting` | `blue-500` | Fast flash (~0.5s cycle) | "Connecting to Server" |
| `reconnecting` | `yellow-500` | Fast flash (~0.5s cycle) | "Reconnecting to Server" |
| `disconnected` | `red-500` | Solid, no animation | "Disconnected from Server" |

**Heartbeat flash:** On each received message from the server (data or ping-derived), the dot briefly flashes white (~150ms) then returns to its state color. This gives a visual "alive" signal.

## Server-Side Heartbeat

- Configure the WebSocket server to send protocol-level pings every 15 seconds
- CrossWS (used by Nitro/H3) supports ping configuration via the `websocket` option in `defineWebSocketHandler` or Nitro config
- When a peer fails to respond with a pong, the framework detects the dead connection and fires the `close` handler, which already calls `removeWsConnection(peer)`
- No changes to the `ws.ts` route handler logic — ping/pong is handled at the framework level

## Client-Side Changes (`useEngineWs`)

### New `reconnecting` state

`WsConnectionStatus` becomes: `'connecting' | 'connected' | 'reconnecting' | 'disconnected'`

- `connecting` — initial connection attempt (first time, or after intentional disconnect)
- `connected` — WebSocket open and subscribed
- `reconnecting` — WebSocket closed unexpectedly while a subscription is active; reconnect in progress
- `disconnected` — intentional disconnect (user navigated away, `disconnect()` called)

### State transitions

- `subscribe()` called → `connecting` (if no existing connection) or stays `connected` (if re-subscribing on open socket)
- `ws.onopen` fires → `connected`
- `ws.onclose` fires with active subscription → `reconnecting`
- `disconnect()` called → `disconnected`
- Stale connection detected by watchdog → close socket, → `reconnecting`

### Staleness watchdog

- Track `lastMessageAt` timestamp, updated on every `ws.onmessage` event
- A `setInterval` watchdog runs every 20 seconds
- If `Date.now() - lastMessageAt > 20_000` (no messages in 20s, meaning at least one 15s ping was missed), close the socket to trigger reconnect
- Watchdog starts when connection is established, stops on intentional disconnect

### Heartbeat ref

- Expose a `lastHeartbeat` reactive ref (timestamp), updated on every `ws.onmessage`
- The TopBar watches this ref and triggers the white flash animation on change

## TopBar Changes

### Remove

- The `<Tag :severity="wsStatusSeverity">` element showing "Connected"/"Connecting..."/"Disconnected" text

### Add

- A dot element: `<span>` with `v-tooltip` for the status text
- CSS classes driven by the `wsStatus` value for color and animation
- A watcher on `lastHeartbeat` that adds a `heartbeat-flash` class briefly (~150ms) then removes it

### Keep unchanged

- On Air / Off Air badge (separate from connection status)
- All other TopBar elements

## CSS Animations

Defined in `main.css`:

- **`ws-pulse-slow`** — opacity 0.6→1→0.6 over 2s, infinite (for `connected`)
- **`ws-flash-fast`** — opacity 0.3→1→0.3 over 0.5s, infinite (for `connecting` and `reconnecting`)
- **`ws-heartbeat`** — background-color flash to white over 150ms (triggered per-message)
