import { listWorkspaces } from 'engine-core'

export default defineEventHandler(() => {
  return listWorkspaces(useDb())
})
