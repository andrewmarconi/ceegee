import { updateLayer } from 'engine-core'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'layerId'))
  const body = await readBody(event)
  return updateLayer(useDb(), id, body)
})
