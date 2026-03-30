import { getElement } from 'engine-core'

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'elementId'))
  const el = getElement(useDb(), id)
  if (!el) throw createError({ statusCode: 404, message: 'Element not found' })
  return el
})
