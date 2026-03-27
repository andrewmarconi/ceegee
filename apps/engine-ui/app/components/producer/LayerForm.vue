<script setup lang="ts">
import type { Layer, LayerRegion } from 'engine-core';

const props = defineProps<{
  layer?: Layer | null;
}>();

const emit = defineEmits<{
  submit: [data: { name: string; zIndex: number; region: LayerRegion | null }];
  cancel: [];
}>();

const regionOptions = [
  { label: 'None', value: '' },
  { label: 'Full', value: 'full' },
  { label: 'Lower Band', value: 'band-lower' },
  { label: 'Upper Band', value: 'band-upper' },
  { label: 'Top Left', value: 'corner-tl' },
  { label: 'Top Right', value: 'corner-tr' },
  { label: 'Bottom Left', value: 'corner-bl' },
  { label: 'Bottom Right', value: 'corner-br' }
];

const state = reactive({
  name: props.layer?.name ?? '',
  zIndex: props.layer?.zIndex ?? 0,
  region: props.layer?.region ?? ''
});

const isEdit = computed(() => !!props.layer);

function handleSubmit() {
  if (!state.name.trim()) return;
  emit('submit', {
    name: state.name.trim(),
    zIndex: Number(state.zIndex),
    region: (state.region || null) as LayerRegion | null
  });
}
</script>

<template>
  <UForm :state="state" @submit="handleSubmit" class="flex flex-col gap-4">
    <UFormField label="Name" name="name" required>
      <UInput v-model="state.name" placeholder="e.g. Lower Thirds" class="w-full" autofocus />
    </UFormField>

    <UFormField label="Z-Index" name="zIndex" help="Higher values render on top">
      <UInput v-model.number="state.zIndex" type="number" class="w-full" />
    </UFormField>

    <UFormField label="Region" name="region">
      <USelect v-model="state.region" :items="regionOptions" value-key="value" class="w-full" />
    </UFormField>

    <div class="flex justify-end gap-2 pt-2">
      <UButton label="Cancel" color="neutral" variant="ghost" @click="emit('cancel')" />
      <UButton :label="isEdit ? 'Save' : 'Create'" type="submit" />
    </div>
  </UForm>
</template>
