import { getChannel } from 'engine-core'

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'channelId'))
  const ch = getChannel(useDb(), id)
  if (!ch) throw createError({ statusCode: 404, message: 'Channel not found' })
  return ch
})
