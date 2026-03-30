# WebSocket Reconnection & Heartbeat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add server-initiated heartbeat pings and a traffic-light connection status indicator to the Operator UI, replacing the text-based WS status tag with a colored dot that flashes on heartbeat.

**Architecture:** The server sends `{ type: 'ping' }` messages to all connected peers every 15 seconds via a Nitro plugin interval. The client composable (`useEngineWs`) adds a `reconnecting` state, a staleness watchdog, and exposes a `lastHeartbeat` ref. The TopBar replaces its WS status `<Tag>` with a single colored dot driven by connection state.

**Tech Stack:** Nitro server plugin, CrossWS, Vue 3 composables, Tailwind CSS animations

---

### Task 1: Add server-side heartbeat ping via Nitro plugin

**Files:**
- Create: `apps/engine-ui/server/plugins/ws-heartbeat.ts`

- [ ] **Step 1: Create the heartbeat plugin**

Create `apps/engine-ui/server/plugins/ws-heartbeat.ts`:

```ts
import { getConnectedPeers } from '../utils/ws-connections';

export default defineNitroPlugin(() => {
  const PING_INTERVAL_MS = 15_000;

  setInterval(() => {
    const peers = getConnectedPeers();
    const ping = JSON.stringify({ type: 'ping' });
    for (const peer of peers) {
      try {
        peer.send(ping);
      } catch {
        // Peer may have disconnected — ignore, close handler will clean up
      }
    }
  }, PING_INTERVAL_MS);
});
```

- [ ] **Step 2: Add getConnectedPeers to ws-connections.ts**

In `apps/engine-ui/server/utils/ws-connections.ts`, add a function to expose the connected peers:

After the existing `getWsConnectionCount` function, add:

```ts
export function getConnectedPeers(): any[] {
  return Array.from(connections.values()).map(c => c.peer);
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm -w run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/engine-ui/server/plugins/ws-heartbeat.ts apps/engine-ui/server/utils/ws-connections.ts
git commit -m "feat(ws): add server-side heartbeat ping every 15s (#11)"
```

---

### Task 2: Add `reconnecting` state, staleness watchdog, and heartbeat ref to useEngineWs

**Files:**
- Modify: `apps/engine-ui/app/composables/useEngineWs.ts`

- [ ] **Step 1: Replace the entire composable**

Replace the full contents of `apps/engine-ui/app/composables/useEngineWs.ts`:

```ts
import type { ChannelState, EngineEvent } from 'engine-core';

export type WsConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

const RECONNECT_DELAY_MS = 2000;
const STALE_TIMEOUT_MS = 20_000;
const WATCHDOG_INTERVAL_MS = 20_000;

export function useEngineWs() {
  const channelState = ref<ChannelState | null>(null);
  const status = ref<WsConnectionStatus>('disconnected');
  const lastHeartbeat = ref<number>(0);

  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let watchdogTimer: ReturnType<typeof setInterval> | null = null;
  let currentWorkspaceId: number | null = null;
  let currentChannelId: number | null = null;
  let lastMessageAt: number = 0;

  function getWsUrl(): string {
    if (import.meta.server) return '';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }

  function startWatchdog() {
    stopWatchdog();
    watchdogTimer = setInterval(() => {
      if (
        status.value === 'connected' &&
        lastMessageAt > 0 &&
        Date.now() - lastMessageAt > STALE_TIMEOUT_MS
      ) {
        // Connection is stale — force reconnect
        if (ws) {
          ws.onclose = null;
          ws.close();
          ws = null;
        }
        scheduleReconnect();
      }
    }, WATCHDOG_INTERVAL_MS);
  }

  function stopWatchdog() {
    if (watchdogTimer) {
      clearInterval(watchdogTimer);
      watchdogTimer = null;
    }
  }

  function scheduleReconnect() {
    if (currentWorkspaceId === null || currentChannelId === null) return;
    status.value = 'reconnecting';
    reconnectTimer = setTimeout(() => {
      if (currentWorkspaceId !== null && currentChannelId !== null) {
        connect(currentWorkspaceId, currentChannelId);
      }
    }, RECONNECT_DELAY_MS);
  }

  function connect(workspaceId: number, channelId: number) {
    if (
      ws
      && ws.readyState === WebSocket.OPEN
      && currentWorkspaceId === workspaceId
      && currentChannelId === channelId
    ) {
      return;
    }

    // Clean up existing connection without clearing subscription intent
    if (ws) {
      ws.onclose = null;
      ws.close();
      ws = null;
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    currentWorkspaceId = workspaceId;
    currentChannelId = channelId;

    if (status.value !== 'reconnecting') {
      status.value = 'connecting';
    }

    const url = getWsUrl();
    if (!url) return;

    ws = new WebSocket(url);

    ws.onopen = () => {
      status.value = 'connected';
      lastMessageAt = Date.now();
      ws!.send(JSON.stringify({
        type: 'subscribe',
        workspaceId,
        channelId
      }));
      startWatchdog();
    };

    ws.onmessage = (event: MessageEvent) => {
      lastMessageAt = Date.now();
      lastHeartbeat.value = Date.now();
      try {
        const engineEvent: EngineEvent = JSON.parse(event.data);
        if (engineEvent.type === 'state:init' || engineEvent.type === 'state:update') {
          channelState.value = engineEvent.payload as ChannelState;
        }
        // 'ping' and other message types are silently consumed — lastMessageAt is already updated
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      ws = null;
      stopWatchdog();
      if (currentWorkspaceId !== null && currentChannelId !== null) {
        scheduleReconnect();
      } else {
        status.value = 'disconnected';
      }
    };

    ws.onerror = () => {
      // onclose will fire after onerror, triggering reconnect
    };
  }

  function subscribe(workspaceId: number, channelId: number) {
    channelState.value = null;
    currentWorkspaceId = workspaceId;
    currentChannelId = channelId;

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'subscribe',
        workspaceId,
        channelId
      }));
    } else {
      connect(workspaceId, channelId);
    }
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    stopWatchdog();
    currentWorkspaceId = null;
    currentChannelId = null;
    if (ws) {
      ws.onclose = null;
      ws.close();
      ws = null;
    }
    status.value = 'disconnected';
    channelState.value = null;
  }

  onUnmounted(() => {
    disconnect();
  });

  return {
    channelState: readonly(channelState),
    status: readonly(status),
    lastHeartbeat: readonly(lastHeartbeat),
    subscribe,
    disconnect
  };
}
```

Key changes from the original:
- `WsConnectionStatus` now includes `'reconnecting'`
- `lastHeartbeat` ref exposed for the UI heartbeat flash
- `lastMessageAt` tracks last received message for staleness detection
- Watchdog interval checks for stale connections every 20s
- `ws.onclose` sets `reconnecting` (not `disconnected`) when subscription is still active
- `scheduleReconnect()` extracted for reuse by both `onclose` and the watchdog

- [ ] **Step 2: Verify build**

Run: `pnpm -w run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/composables/useEngineWs.ts
git commit -m "feat(ws): add reconnecting state, staleness watchdog, and heartbeat ref (#11)"
```

---

### Task 3: Add CSS animations for the connection status dot

**Files:**
- Modify: `apps/engine-ui/app/assets/css/main.css`

- [ ] **Step 1: Add connection status animations**

Add at the end of `apps/engine-ui/app/assets/css/main.css`:

```css

/* -- WebSocket connection status indicator -- */

@keyframes ws-pulse-slow {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

@keyframes ws-flash-fast {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

@keyframes ws-heartbeat-flash {
  0% { background-color: white; }
  100% { background-color: var(--ws-dot-color); }
}

.ws-dot-connected {
  --ws-dot-color: oklch(0.723 0.191 142.542);
  background-color: var(--ws-dot-color);
  animation: ws-pulse-slow 2s ease-in-out infinite;
}

.ws-dot-connecting {
  --ws-dot-color: oklch(0.623 0.214 259.815);
  background-color: var(--ws-dot-color);
  animation: ws-flash-fast 0.5s ease-in-out infinite;
}

.ws-dot-reconnecting {
  --ws-dot-color: oklch(0.795 0.184 86.047);
  background-color: var(--ws-dot-color);
  animation: ws-flash-fast 0.5s ease-in-out infinite;
}

.ws-dot-disconnected {
  --ws-dot-color: oklch(0.637 0.237 25.331);
  background-color: var(--ws-dot-color);
}

.ws-dot-heartbeat {
  animation: ws-heartbeat-flash 150ms ease-out forwards !important;
}
```

Note: The oklch values are Tailwind's `green-500`, `blue-500`, `yellow-500`, and `red-500` respectively.

- [ ] **Step 2: Commit**

```bash
git add apps/engine-ui/app/assets/css/main.css
git commit -m "feat(operator): add CSS animations for WS connection status dot (#11)"
```

---

### Task 4: Replace WS status Tag with traffic-light dot in TopBar

**Files:**
- Modify: `apps/engine-ui/app/components/operator/TopBar.vue`

- [ ] **Step 1: Add lastHeartbeat prop and dot logic to script**

In the `<script setup>` block of `TopBar.vue`:

Add `lastHeartbeat` to the props:

```ts
const props = defineProps<{
  workspaces: Workspace[]
  channels: Channel[]
  layers: Layer[]
  selectedWorkspaceId: number | null
  selectedChannelId: number | null
  wsStatus: WsConnectionStatus
  lastHeartbeat: number
  channelState: ChannelState | null
}>()
```

Replace the `wsStatusSeverity` and `wsStatusLabel` computeds with:

```ts
const wsStatusTooltip = computed(() => {
  switch (props.wsStatus) {
    case 'connected': return 'Connected to Server'
    case 'connecting': return 'Connecting to Server'
    case 'reconnecting': return 'Reconnecting to Server'
    case 'disconnected': return 'Disconnected from Server'
    default: return 'Unknown'
  }
})

const wsDotClass = computed(() => {
  switch (props.wsStatus) {
    case 'connected': return 'ws-dot-connected'
    case 'connecting': return 'ws-dot-connecting'
    case 'reconnecting': return 'ws-dot-reconnecting'
    case 'disconnected': return 'ws-dot-disconnected'
    default: return 'ws-dot-disconnected'
  }
})

const isHeartbeatFlashing = ref(false)
let heartbeatTimeout: ReturnType<typeof setTimeout> | null = null

watch(() => props.lastHeartbeat, () => {
  if (props.lastHeartbeat === 0) return
  isHeartbeatFlashing.value = true
  if (heartbeatTimeout) clearTimeout(heartbeatTimeout)
  heartbeatTimeout = setTimeout(() => {
    isHeartbeatFlashing.value = false
  }, 150)
})
```

- [ ] **Step 2: Replace the Tag element in the template**

Find and remove this entire `<Tag>` block:

```vue
    <Tag
      :severity="wsStatusSeverity"
      class="gap-1.5"
    >
      <span
        class="size-2 rounded-full"
        :class="{
          'bg-green-500': wsStatus === 'connected',
          'bg-yellow-500 animate-pulse': wsStatus === 'connecting',
          'bg-red-500': wsStatus === 'disconnected'
        }"
      />
      {{ wsStatusLabel }}
    </Tag>
```

Replace with:

```vue
    <span
      v-tooltip.bottom="wsStatusTooltip"
      class="size-2.5 rounded-full shrink-0 cursor-default"
      :class="[wsDotClass, isHeartbeatFlashing ? 'ws-dot-heartbeat' : '']"
    />
```

- [ ] **Step 3: Verify build**

Run: `pnpm -w run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/engine-ui/app/components/operator/TopBar.vue
git commit -m "feat(operator): replace WS status tag with traffic-light dot (#11)"
```

---

### Task 5: Wire lastHeartbeat prop through operator page

**Files:**
- Modify: `apps/engine-ui/app/pages/app/[workspaceId]/operator.vue`

- [ ] **Step 1: Pass lastHeartbeat to TopBar**

In the operator page template, find the `<OperatorTopBar>` component and add the `:last-heartbeat` prop.

Find:

```vue
      :ws-status="wsStatus"
      :channel-state="channelState"
```

Replace with:

```vue
      :ws-status="wsStatus"
      :last-heartbeat="lastHeartbeat"
      :channel-state="channelState"
```

- [ ] **Step 2: Destructure lastHeartbeat from useEngineWs**

In the script section, find:

```ts
const { channelState, status: wsStatus, subscribe, disconnect } = useEngineWs()
```

Replace with:

```ts
const { channelState, status: wsStatus, lastHeartbeat, subscribe, disconnect } = useEngineWs()
```

- [ ] **Step 3: Verify build**

Run: `pnpm -w run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add 'apps/engine-ui/app/pages/app/[workspaceId]/operator.vue'
git commit -m "feat(operator): wire lastHeartbeat prop to TopBar (#11)"
```

---

### Task 6: Final integration verification

- [ ] **Step 1: Full build check**

Run: `pnpm -w run build`
Expected: Build succeeds with no errors.

- [ ] **Step 2: Manual walkthrough**

With dev server running (`pnpm dev`), verify:

1. **Connected state:** Green dot with slow pulse visible in TopBar
2. **Heartbeat flash:** Every ~15 seconds, the dot briefly flashes white then returns to green
3. **Tooltip:** Hovering over the dot shows "Connected to Server"
4. **Disconnect test:** Stop the server — dot turns yellow (reconnecting) with fast flash, tooltip shows "Reconnecting to Server"
5. **Reconnect test:** Restart the server — dot returns to green after reconnection
6. **On Air / Off Air badge:** Still visible and functioning independently from the connection dot

- [ ] **Step 3: Commit any fixes**

If any issues found, fix and commit with descriptive message referencing #11.
