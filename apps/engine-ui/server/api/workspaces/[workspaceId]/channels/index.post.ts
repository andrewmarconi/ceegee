import { createChannel } from 'engine-core'

export default defineEventHandler(async (event) => {
  const workspaceId = Number(getRouterParam(event, 'workspaceId'))
  const body = await readBody(event)
  return createChannel(useDb(), { ...body, workspaceId })
})
