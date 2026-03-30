import { buildChannelState } from 'engine-core'

export default defineWebSocketHandler({
  open(_peer) {
    // Client must send a subscribe message after connecting
  },

  message(peer, message) {
    try {
      const data = JSON.parse(message.text())

      if (data.type === 'subscribe') {
        const workspaceId = Number(data.workspaceId)
        const channelId = Number(data.channelId)

        if (!workspaceId || !channelId) {
          peer.send(JSON.stringify({ type: 'error', message: 'Invalid workspaceId or channelId' }))
          return
        }

        // Remove any existing subscription for this peer (re-subscribe)
        removeWsConnection(peer)
        addWsConnection(peer, workspaceId, channelId)

        // Send initial channel state
        const db = useDb()
        const state = buildChannelState(db, workspaceId, channelId)
        peer.send(JSON.stringify({ type: 'state:init', payload: state }))
      }
    } catch {
      // Ignore malformed messages
    }
  },

  close(peer) {
    removeWsConnection(peer)
  }
})
