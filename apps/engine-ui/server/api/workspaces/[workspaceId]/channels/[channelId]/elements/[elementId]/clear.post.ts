import { clear } from 'engine-core'

export default defineEventHandler((event) => {
  const elementId = Number(getRouterParam(event, 'elementId'))
  try {
    const state = clear(useDb(), elementId)
    broadcastToChannel(state.workspaceId, state.channelId, { type: 'state:update', payload: state })
    return state
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Layer is locked') {
      throw createError({ statusCode: 403, statusMessage: 'Layer is locked' })
    }
    throw err
  }
})
