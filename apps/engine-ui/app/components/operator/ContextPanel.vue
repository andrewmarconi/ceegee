<script setup lang="ts">
import type { Element, ChannelState, ElementVisibility, WorkspaceDisplayConfig } from 'engine-core'

const props = defineProps<{
  element: Element | null
  channelState: ChannelState | null
  workspaceId: number
  channelId: number | null
  displayConfig?: WorkspaceDisplayConfig | null
}>()

const emit = defineEmits<{
  'update-element': [elementId: number, fields: { name?: string, config?: unknown }]
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

const { statusLabel: stateLabel, statusSeverity: stateSeverity } = useVisibilityStyle(visibility)

const isAnythingOnAir = computed(() => {
  if (!props.channelState) return false
  return props.channelState.layers.some(layer =>
    layer.elements.some(el => el.visibility === 'visible' || el.visibility === 'entering')
  )
})

const channelPreviewUrl = computed(() => {
  if (!props.workspaceId || !props.channelId) return ''
  return `/o/${props.workspaceId}/channel/${props.channelId}`
})

const previewContainer = ref<HTMLElement | null>(null)
const containerWidth = ref(0)

const outputWidth = computed(() => props.displayConfig?.baseWidth ?? 1920)
const outputHeight = computed(() => props.displayConfig?.baseHeight ?? 1080)

const previewScale = computed(() => {
  if (!containerWidth.value) return 1
  return containerWidth.value / outputWidth.value
})

let ro: ResizeObserver | null = null

watch(previewContainer, (el, oldEl) => {
  if (oldEl && ro) {
    ro.unobserve(oldEl)
  }
  if (el) {
    if (!ro) {
      ro = new ResizeObserver((entries) => {
        containerWidth.value = entries[0]?.contentRect.width ?? 0
      })
    }
    ro.observe(el)
  }
})

onUnmounted(() => ro?.disconnect())

const editableConfigFields = computed(() => {
  const fields: { key: string, label: string, multiline: boolean }[] = []
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

  const updates: { name?: string, config?: unknown } = {}

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
</script>

<template>
  <div class="flex flex-col h-full">
    <div
      v-if="channelPreviewUrl"
      class="px-3 py-3 border-b border-surface-700"
    >
      <p class="text-xs text-surface-400 mb-2">
        Channel Preview
      </p>
      <div
        ref="previewContainer"
        class="relative w-full bg-black rounded overflow-hidden border-t-2"
        :class="isAnythingOnAir ? 'border-t-red-500' : 'border-t-transparent'"
        :style="{ aspectRatio: `${outputWidth} / ${outputHeight}` }"
      >
        <iframe
          :src="channelPreviewUrl"
          class="absolute border-0 origin-top-left"
          :style="{
            width: `${outputWidth}px`,
            height: `${outputHeight}px`,
            transform: `scale(${previewScale})`,
          }"
          scrolling="no"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>

    <div class="px-3 py-2 border-b border-surface-700">
      <h2 class="text-sm font-semibold text-surface-400 uppercase tracking-wide">
        Context
      </h2>
    </div>

    <div
      v-if="!element"
      class="flex-1 flex items-center justify-center p-4"
    >
      <p class="text-sm text-surface-400 text-center">
        Click the pencil icon on an element to edit.
      </p>
    </div>

    <div
      v-else
      class="flex-1 overflow-y-auto"
    >
      <div class="px-3 py-2 border-b border-surface-800 flex items-center justify-between">
        <span class="text-sm font-medium">{{ element.name }}</span>
        <Tag :severity="stateSeverity">
          {{ stateLabel }}
        </Tag>
      </div>

      <div class="px-3 py-3 space-y-3">
        <p class="text-xs text-surface-400">
          Quick Edit
        </p>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">Name</label>
          <InputText
            v-model="editName"
            placeholder="Element name"
            fluid
            @update:model-value="markDirty"
          />
        </div>

        <div
          v-for="field in editableConfigFields"
          :key="field.key"
          class="flex flex-col gap-1"
        >
          <label class="text-sm font-medium">{{ field.label }}</label>
          <Textarea
            v-if="field.multiline"
            :model-value="String(editConfig[field.key] ?? '')"
            :placeholder="field.label"
            :rows="3"
            fluid
            @update:model-value="(val: string) => onConfigFieldInput(field.key, val)"
          />
          <InputText
            v-else
            :model-value="String(editConfig[field.key] ?? '')"
            :placeholder="field.label"
            fluid
            @update:model-value="(val: string) => onConfigFieldInput(field.key, val)"
          />
        </div>

        <Button
          label="Save Changes"
          :disabled="!isDirty"
          class="w-full"
          @click="saveChanges"
        />
      </div>
    </div>
  </div>
</template>
