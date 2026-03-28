<script setup lang="ts">
import type { Workspace } from 'engine-core'

const props = defineProps<{
  workspace?: Workspace | null
}>()

const emit = defineEmits<{
  submit: [data: { name: string, description: string, themeTokens?: Record<string, string> }]
  cancel: []
}>()

const state = reactive({
  name: props.workspace?.name ?? '',
  description: props.workspace?.description ?? ''
})

const isEdit = computed(() => !!props.workspace)

function handleSubmit() {
  if (!state.name.trim()) return
  emit('submit', {
    name: state.name.trim(),
    description: state.description.trim()
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
        placeholder="e.g. Live Show 2026"
        autofocus
        fluid
      />
    </div>

    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium">Description</label>
      <Textarea
        v-model="state.description"
        placeholder="Optional description"
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
