import { updateChannel } from 'engine-core'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'channelId'))
  const body = await readBody(event)
  return updateChannel(useDb(), id, body)
})
