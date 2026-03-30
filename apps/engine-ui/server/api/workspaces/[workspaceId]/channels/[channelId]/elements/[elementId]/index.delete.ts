import { deleteElement } from 'engine-core'

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'elementId'))
  deleteElement(useDb(), id)
  return { ok: true }
})
