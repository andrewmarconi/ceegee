import type { ElementVisibility } from 'engine-core'

const visibilityClassMap: Record<ElementVisibility, string> = {
  visible: 'status-visible',
  entering: 'status-entering',
  exiting: 'status-exiting',
  hidden: 'status-hidden',
}

const visibilityLabelMap: Record<ElementVisibility, string> = {
  visible: 'On Air',
  entering: 'Entering',
  exiting: 'Exiting',
  hidden: 'Ready',
}

const visibilitySeverityMap: Record<ElementVisibility, 'danger' | 'warn' | 'secondary'> = {
  visible: 'danger',
  entering: 'danger',
  exiting: 'warn',
  hidden: 'secondary',
}

export function useVisibilityStyle(visibility: MaybeRefOrGetter<ElementVisibility>) {
  const vis = computed(() => toValue(visibility))

  const statusClass = computed(() => visibilityClassMap[vis.value])
  const statusLabel = computed(() => visibilityLabelMap[vis.value])
  const statusSeverity = computed(() => visibilitySeverityMap[vis.value])
  const isLive = computed(() => vis.value === 'visible' || vis.value === 'entering')

  return { statusClass, statusLabel, statusSeverity, isLive }
}
