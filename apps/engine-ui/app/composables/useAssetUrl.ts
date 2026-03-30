export function useAssetUrl(workspaceId: MaybeRef<number>, assetId: MaybeRef<number | null | undefined>) {
  return computed(() => {
    const id = toValue(assetId)
    if (!id) return null
    return `/api/workspaces/${toValue(workspaceId)}/assets/${id}/file`
  })
}
