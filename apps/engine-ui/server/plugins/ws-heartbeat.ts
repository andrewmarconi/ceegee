import { getConnectedPeers } from '../utils/ws-connections'

export default defineNitroPlugin(() => {
  const PING_INTERVAL_MS = 15_000

  setInterval(() => {
    const peers = getConnectedPeers()
    const ping = JSON.stringify({ type: 'ping' })
    for (const peer of peers) {
      try {
        peer.send(ping)
      } catch {
        // Peer may have disconnected — ignore, close handler will clean up
      }
    }
  }, PING_INTERVAL_MS)
})
