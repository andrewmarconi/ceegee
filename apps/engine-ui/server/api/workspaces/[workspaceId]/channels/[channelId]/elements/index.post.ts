import { createElement } from 'engine-core'

export default defineEventHandler(async (event) => {
  const workspaceId = Number(getRouterParam(event, 'workspaceId'))
  const channelId = Number(getRouterParam(event, 'channelId'))
  const body = await readBody(event)
  return createElement(useDb(), { ...body, workspaceId, channelId })
})
