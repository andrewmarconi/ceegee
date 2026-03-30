import type { ChannelState, EngineEvent } from 'engine-core'

export type WsConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

const RECONNECT_DELAY_MS = 2000
const STALE_TIMEOUT_MS = 20_000
const WATCHDOG_INTERVAL_MS = 20_000

export function useEngineWs() {
  const channelState = ref<ChannelState | null>(null)
  const status = ref<WsConnectionStatus>('disconnected')
  const lastHeartbeat = ref<number>(0)

  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let watchdogTimer: ReturnType<typeof setInterval> | null = null
  let currentWorkspaceId: number | null = null
  let currentChannelId: number | null = null
  let lastMessageAt: number = 0

  function getWsUrl(): string {
    if (import.meta.server) return ''
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/ws`
  }

  function startWatchdog() {
    stopWatchdog()
    watchdogTimer = setInterval(() => {
      if (
        status.value === 'connected'
        && lastMessageAt > 0
        && Date.now() - lastMessageAt > STALE_TIMEOUT_MS
      ) {
        // Connection is stale — force reconnect
        if (ws) {
          ws.onclose = null
          ws.close()
          ws = null
        }
        scheduleReconnect()
      }
    }, WATCHDOG_INTERVAL_MS)
  }

  function stopWatchdog() {
    if (watchdogTimer) {
      clearInterval(watchdogTimer)
      watchdogTimer = null
    }
  }

  function scheduleReconnect() {
    if (currentWorkspaceId === null || currentChannelId === null) return
    status.value = 'reconnecting'
    reconnectTimer = setTimeout(() => {
      if (currentWorkspaceId !== null && currentChannelId !== null) {
        connect(currentWorkspaceId, currentChannelId)
      }
    }, RECONNECT_DELAY_MS)
  }

  function connect(workspaceId: number, channelId: number) {
    if (
      ws
      && ws.readyState === WebSocket.OPEN
      && currentWorkspaceId === workspaceId
      && currentChannelId === channelId
    ) {
      return
    }

    // Clean up existing connection without clearing subscription intent
    if (ws) {
      ws.onclose = null
      ws.close()
      ws = null
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    currentWorkspaceId = workspaceId
    currentChannelId = channelId

    if (status.value !== 'reconnecting') {
      status.value = 'connecting'
    }

    const url = getWsUrl()
    if (!url) return

    ws = new WebSocket(url)

    ws.onopen = () => {
      status.value = 'connected'
      lastMessageAt = Date.now()
      ws!.send(JSON.stringify({
        type: 'subscribe',
        workspaceId,
        channelId
      }))
      startWatchdog()
    }

    ws.onmessage = (event: MessageEvent) => {
      lastMessageAt = Date.now()
      lastHeartbeat.value = Date.now()
      try {
        const engineEvent: EngineEvent = JSON.parse(event.data)
        if (engineEvent.type === 'state:init' || engineEvent.type === 'state:update') {
          channelState.value = engineEvent.payload as ChannelState
        }
        // 'ping' and other message types are silently consumed — lastMessageAt is already updated
      } catch {
        // Ignore malformed messages
      }
    }

    ws.onclose = () => {
      ws = null
      stopWatchdog()
      if (currentWorkspaceId !== null && currentChannelId !== null) {
        scheduleReconnect()
      } else {
        status.value = 'disconnected'
      }
    }

    ws.onerror = () => {
      // onclose will fire after onerror, triggering reconnect
    }
  }

  function subscribe(workspaceId: number, channelId: number) {
    channelState.value = null
    currentWorkspaceId = workspaceId
    currentChannelId = channelId

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'subscribe',
        workspaceId,
        channelId
      }))
    } else {
      connect(workspaceId, channelId)
    }
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    stopWatchdog()
    currentWorkspaceId = null
    currentChannelId = null
    if (ws) {
      ws.onclose = null
      ws.close()
      ws = null
    }
    status.value = 'disconnected'
    channelState.value = null
  }

  onUnmounted(() => {
    disconnect()
  })

  return {
    channelState: computed(() => channelState.value),
    status: computed(() => status.value),
    lastHeartbeat: computed(() => lastHeartbeat.value),
    subscribe,
    disconnect
  }
}
