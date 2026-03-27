<script setup lang="ts">
import type { Workspace } from 'engine-core';

const props = defineProps<{
  workspace?: Workspace | null;
}>();

const emit = defineEmits<{
  submit: [data: { name: string; description: string; themeTokens?: Record<string, string> }];
  cancel: [];
}>();

const state = reactive({
  name: props.workspace?.name ?? '',
  description: props.workspace?.description ?? ''
});

const isEdit = computed(() => !!props.workspace);

function handleSubmit() {
  if (!state.name.trim()) return;
  emit('submit', {
    name: state.name.trim(),
    description: state.description.trim()
  });
}
</script>

<template>
  <UForm :state="state" @submit="handleSubmit" class="flex flex-col gap-4">
    <UFormField label="Name" name="name" required>
      <UInput v-model="state.name" placeholder="e.g. Live Show 2026" class="w-full" autofocus />
    </UFormField>

    <UFormField label="Description" name="description">
      <UTextarea v-model="state.description" placeholder="Optional description" class="w-full" />
    </UFormField>

    <div class="flex justify-end gap-2 pt-2">
      <UButton label="Cancel" color="neutral" variant="ghost" @click="emit('cancel')" />
      <UButton :label="isEdit ? 'Save' : 'Create'" type="submit" />
    </div>
  </UForm>
</template>
