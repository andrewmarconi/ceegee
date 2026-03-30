import { clearAll } from 'engine-core'

export default defineEventHandler((event) => {
  const workspaceId = Number(getRouterParam(event, 'workspaceId'))
  const channelId = Number(getRouterParam(event, 'channelId'))
  const state = clearAll(useDb(), workspaceId, channelId)
  broadcastToChannel(state.workspaceId, state.channelId, { type: 'state:update', payload: state })
  return state
})
