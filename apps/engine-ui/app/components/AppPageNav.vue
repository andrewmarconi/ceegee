<script setup lang="ts">
const props = defineProps<{
  workspaceId: number | string
}>()

const route = useRoute()
const router = useRouter()

const options = computed(() => [
  { icon: 'pi pi-play', value: 'operator' },
  { icon: 'pi pi-cog', value: 'producer' },
  { icon: 'pi pi-image', value: 'assets' }
])

const activeValue = computed(() => {
  const path = route.path
  if (path.includes('/assets')) return 'assets'
  if (path.includes('/producer')) return 'producer'
  if (path.includes('/operator')) return 'operator'
  return null
})

function navigate(value: string) {
  if (!value || value === activeValue.value) return
  const routes: Record<string, string> = {
    operator: `/app/${props.workspaceId}/operator`,
    producer: `/app/${props.workspaceId}/producer`,
    assets: `/app/${props.workspaceId}/producer/assets`
  }
  if (routes[value]) router.push(routes[value])
}
</script>

<template>
  <SelectButton
    :model-value="activeValue"
    :options="options"
    option-value="value"
    :allow-empty="false"
    size="small"
    @update:model-value="navigate"
  >
    <template #option="{ option }">
      <i :class="option.icon" />
    </template>
  </SelectButton>
</template>
