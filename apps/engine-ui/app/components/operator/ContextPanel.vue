<script setup lang="ts">
import type { Element, ChannelState, ElementVisibility } from 'engine-core'

const props = defineProps<{
  element: Element | null
  channelState: ChannelState | null
  workspaceId: number
}>()

const emit = defineEmits<{
  'update-element': [elementId: number, fields: { name?: string; config?: unknown }]
}>()

const editName = ref('')
const editConfig = ref<Record<string, unknown>>({})
const isDirty = ref(false)

watch(() => props.element, (el) => {
  if (el) {
    editName.value = el.name
    editConfig.value = typeof el.config === 'object' && el.config !== null
      ? { ...(el.config as Record<string, unknown>) }
      : {}
    isDirty.value = false
  } else {
    editName.value = ''
    editConfig.value = {}
    isDirty.value = false
  }
}, { immediate: true })

function markDirty() {
  isDirty.value = true
}

function getElementVisibility(): ElementVisibility {
  if (!props.element || !props.channelState) return 'hidden'
  for (const layer of props.channelState.layers) {
    for (const el of layer.elements) {
      if (el.elementId === props.element.id) return el.visibility
    }
  }
  return 'hidden'
}

const visibility = computed(() => getElementVisibility())

const stateLabel = computed(() => {
  switch (visibility.value) {
    case 'visible': return 'Live (On Air)'
    case 'entering': return 'Entering'
    case 'exiting': return 'Exiting'
    default: return 'Ready'
  }
})

const stateColor = computed(() => {
  switch (visibility.value) {
    case 'visible': case 'entering': return 'error'
    case 'exiting': return 'warning'
    default: return 'success'
  }
})

const editableConfigFields = computed(() => {
  const fields: { key: string; label: string; multiline: boolean }[] = []
  for (const [key, value] of Object.entries(editConfig.value)) {
    if (typeof value === 'string') {
      const multiline = /text|body|description|content/i.test(key)
      const label = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]/g, ' ')
        .replace(/^\s/, '')
        .replace(/\b\w/g, c => c.toUpperCase())
      fields.push({ key, label, multiline })
    }
  }
  return fields
})

function onConfigFieldInput(key: string, value: string) {
  editConfig.value[key] = value
  markDirty()
}

function saveChanges() {
  if (!props.element || !isDirty.value) return

  const updates: { name?: string; config?: unknown } = {}

  if (editName.value !== props.element.name) {
    updates.name = editName.value
  }

  const originalConfig = typeof props.element.config === 'object' && props.element.config !== null
    ? props.element.config as Record<string, unknown>
    : {}
  const mergedConfig = { ...originalConfig }
  for (const field of editableConfigFields.value) {
    mergedConfig[field.key] = editConfig.value[field.key]
  }
  updates.config = mergedConfig

  emit('update-element', props.element.id, updates)
  isDirty.value = false
}

const previewUrl = computed(() => {
  if (!props.element) return ''
  return `/o/${props.workspaceId}/element/${props.element.id}`
})
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="px-3 py-2 border-b border-gray-200 dark:border-gray-800">
      <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Context</h2>
    </div>

    <div v-if="!element" class="flex-1 flex items-center justify-center p-4">
      <p class="text-sm text-gray-400 text-center">
        Select an element from the rundown or a layer to see details.
      </p>
    </div>

    <div v-else class="flex-1 overflow-y-auto">
      <div class="px-3 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ element.name }}</span>
        <UBadge :color="stateColor" variant="subtle">{{ stateLabel }}</UBadge>
      </div>

      <div class="px-3 py-3 border-b border-gray-100 dark:border-gray-800">
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Preview</p>
        <div class="relative w-full bg-black rounded overflow-hidden" style="aspect-ratio: 16/9;">
          <iframe
            :src="previewUrl"
            class="absolute inset-0 w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>

      <div class="px-3 py-3 space-y-3">
        <p class="text-xs text-gray-500 dark:text-gray-400">Quick Edit</p>

        <UFormField label="Name">
          <UInput
            v-model="editName"
            placeholder="Element name"
            @update:model-value="markDirty"
          />
        </UFormField>

        <UFormField
          v-for="field in editableConfigFields"
          :key="field.key"
          :label="field.label"
        >
          <UTextarea
            v-if="field.multiline"
            :model-value="String(editConfig[field.key] ?? '')"
            :placeholder="field.label"
            :rows="3"
            @update:model-value="(val: string) => onConfigFieldInput(field.key, val)"
          />
          <UInput
            v-else
            :model-value="String(editConfig[field.key] ?? '')"
            :placeholder="field.label"
            @update:model-value="(val: string) => onConfigFieldInput(field.key, val)"
          />
        </UFormField>

        <UButton
          label="Save Changes"
          color="primary"
          variant="solid"
          block
          :disabled="!isDirty"
          @click="saveChanges"
        />
      </div>
    </div>
  </div>
</template>
