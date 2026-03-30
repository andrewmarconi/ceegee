import { getLayer } from 'engine-core'

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'layerId'))
  const layer = getLayer(useDb(), id)
  if (!layer) throw createError({ statusCode: 404, message: 'Layer not found' })
  return layer
})
