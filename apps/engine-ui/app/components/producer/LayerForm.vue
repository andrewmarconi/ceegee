<script setup lang="ts">
import type { Layer, LayerRegion } from 'engine-core'

const props = defineProps<{
  layer?: Layer | null
}>()

const emit = defineEmits<{
  submit: [data: { name: string, zIndex: number, region: LayerRegion | null }]
  cancel: []
}>()

const regionOptions = [
  { label: 'None', value: '' },
  { label: 'Full', value: 'full' },
  { label: 'Lower Band', value: 'band-lower' },
  { label: 'Upper Band', value: 'band-upper' },
  { label: 'Top Left', value: 'corner-tl' },
  { label: 'Top Right', value: 'corner-tr' },
  { label: 'Bottom Left', value: 'corner-bl' },
  { label: 'Bottom Right', value: 'corner-br' }
]

const state = reactive({
  name: props.layer?.name ?? '',
  zIndex: props.layer?.zIndex ?? 0,
  region: props.layer?.region ?? ''
})

const isEdit = computed(() => !!props.layer)

function handleSubmit() {
  if (!state.name.trim()) return
  emit('submit', {
    name: state.name.trim(),
    zIndex: Number(state.zIndex),
    region: (state.region || null) as LayerRegion | null
  })
}
</script>

<template>
  <form
    class="flex flex-col gap-4"
    @submit.prevent="handleSubmit"
  >
    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium">Name <span class="text-red-500">*</span></label>
      <InputText
        v-model="state.name"
        placeholder="e.g. Lower Thirds"
        autofocus
        fluid
      />
    </div>

    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium">Z-Index</label>
      <small class="text-surface-500">Higher values render on top</small>
      <InputNumber
        v-model="state.zIndex"
        fluid
      />
    </div>

    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium">Region</label>
      <Select
        v-model="state.region"
        :options="regionOptions"
        option-label="label"
        option-value="value"
        placeholder="Select region"
        fluid
      />
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <Button
        label="Cancel"
        severity="secondary"
        text
        @click="emit('cancel')"
      />
      <Button
        :label="isEdit ? 'Save' : 'Create'"
        type="submit"
      />
    </div>
  </form>
</template>
