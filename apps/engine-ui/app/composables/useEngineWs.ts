import type { ChannelState, EngineEvent } from 'engine-core';

export function useEngineWs(workspaceId: Ref<number> | number, channelId: Ref<number> | number) {
  const channelState = ref<ChannelState | null>(null);
  const connected = ref(false);
  let ws: WebSocket | null = null;
  let stopped = false;

  function connect() {
    if (import.meta.server || stopped) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      connected.value = true;
      ws!.send(JSON.stringify({
        type: 'subscribe',
        workspaceId: toValue(workspaceId),
        channelId: toValue(channelId),
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data: EngineEvent = JSON.parse(event.data);
        if (data.type === 'state:init' || data.type === 'state:update') {
          channelState.value = data.payload as ChannelState;
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      connected.value = false;
      if (!stopped) setTimeout(connect, 2000);
    };

    ws.onerror = () => {
      ws?.close();
    };
  }

  onMounted(connect);

  onUnmounted(() => {
    stopped = true;
    ws?.close();
  });

  return { channelState: readonly(channelState), connected: readonly(connected) };
}
