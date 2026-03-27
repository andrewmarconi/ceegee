import type { ChannelState, EngineEvent } from 'engine-core';

export type WsConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export function useEngineWs() {
  const channelState = ref<ChannelState | null>(null);
  const status = ref<WsConnectionStatus>('disconnected');

  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let currentWorkspaceId: number | null = null;
  let currentChannelId: number | null = null;

  function getWsUrl(): string {
    if (import.meta.server) return '';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
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

    disconnect();

    currentWorkspaceId = workspaceId;
    currentChannelId = channelId;
    status.value = 'connecting';

    const url = getWsUrl();
    if (!url) return;

    ws = new WebSocket(url);

    ws.onopen = () => {
      status.value = 'connected';
      ws!.send(JSON.stringify({
        type: 'subscribe',
        workspaceId,
        channelId
      }));
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const engineEvent: EngineEvent = JSON.parse(event.data);
        if (engineEvent.type === 'state:init' || engineEvent.type === 'state:update') {
          channelState.value = engineEvent.payload as ChannelState;
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      status.value = 'disconnected';
      ws = null;
      if (currentWorkspaceId !== null && currentChannelId !== null) {
        reconnectTimer = setTimeout(() => {
          if (currentWorkspaceId !== null && currentChannelId !== null) {
            connect(currentWorkspaceId, currentChannelId);
          }
        }, 2000);
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
    subscribe,
    disconnect
  };
}
