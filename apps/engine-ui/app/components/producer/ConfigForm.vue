<script setup lang="ts">
import type { Asset, JsonSchemaLike, WorkspaceId } from 'engine-core'

const props = defineProps<{
  schema: JsonSchemaLike
  modelValue: Record<string, unknown>
  workspaceId: WorkspaceId
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>]
}>()

type SchemaProperty = {
  key: string
  type: string | string[]
  title: string
  description?: string
  enumValues?: string[]
  default?: unknown
  properties?: Record<string, unknown>
  required?: boolean
}

function isAssetRef(field: SchemaProperty): boolean {
  const t = field.type
  return Array.isArray(t)
    && t.includes('integer')
    && t.includes('null')
}

const { data: assets } = useFetch<Asset[]>(
  () => `/api/workspaces/${props.workspaceId}/assets`
)

const imageAssets = computed(() =>
  (assets.value ?? []).filter(a => a.mimeType.startsWith('image/'))
)

function getAssetValue(key: string): number | null {
  const v = getValue(key)
  return typeof v === 'number' ? v : null
}

const fields = computed<SchemaProperty[]>(() => {
  const properties = (props.schema.properties ?? {}) as Record<string, Record<string, unknown>>
  const required = (props.schema.required ?? []) as string[]

  return Object.entries(properties).map(([key, prop]) => ({
    key,
    type: (prop.type as string) ?? 'string',
    title: (prop.title as string) ?? key,
    description: prop.description as string | undefined,
    enumValues: prop.enum as string[] | undefined,
    default: prop.default,
    properties: prop.properties as Record<string, unknown> | undefined,
    required: required.includes(key)
  }))
})

function getValue(key: string): unknown {
  return props.modelValue[key]
}

function setValue(key: string, value: unknown) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function getStringValue(key: string): string {
  return (getValue(key) as string) ?? ''
}

function getNumberValue(key: string): number {
  return (getValue(key) as number) ?? 0
}

function getBooleanValue(key: string): boolean {
  return (getValue(key) as boolean) ?? false
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div
      v-if="fields.length === 0"
      class="text-sm text-surface-400 py-2"
    >
      This module has no configuration options.
    </div>

    <template
      v-for="field in fields"
      :key="field.key"
    >
      <div
        v-if="field.type === 'string' && field.enumValues"
        class="flex flex-col gap-1"
      >
        <label class="text-sm font-medium">
          {{ field.title }}
          <span
            v-if="field.required"
            class="text-red-500"
          >*</span>
        </label>
        <small
          v-if="field.description"
          class="text-surface-500"
        >{{ field.description }}</small>
        <Select
          :model-value="getStringValue(field.key)"
          :options="field.enumValues"
          fluid
          @update:model-value="setValue(field.key, $event)"
        />
      </div>

      <div
        v-else-if="field.type === 'string'"
        class="flex flex-col gap-1"
      >
        <label class="text-sm font-medium">
          {{ field.title }}
          <span
            v-if="field.required"
            class="text-red-500"
          >*</span>
        </label>
        <small
          v-if="field.description"
          class="text-surface-500"
        >{{ field.description }}</small>
        <InputText
          :model-value="getStringValue(field.key)"
          fluid
          @update:model-value="setValue(field.key, $event)"
        />
      </div>

      <div
        v-else-if="field.type === 'number' || field.type === 'integer'"
        class="flex flex-col gap-1"
      >
        <label class="text-sm font-medium">
          {{ field.title }}
          <span
            v-if="field.required"
            class="text-red-500"
          >*</span>
        </label>
        <small
          v-if="field.description"
          class="text-surface-500"
        >{{ field.description }}</small>
        <InputNumber
          :model-value="getNumberValue(field.key)"
          fluid
          @update:model-value="setValue(field.key, $event)"
        />
      </div>

      <div
        v-else-if="field.type === 'boolean'"
        class="flex items-center gap-2"
      >
        <Checkbox
          :model-value="getBooleanValue(field.key)"
          :binary="true"
          :input-id="field.key"
          @update:model-value="setValue(field.key, $event)"
        />
        <label
          :for="field.key"
          class="text-sm font-medium"
        >{{ field.title }}</label>
        <small
          v-if="field.description"
          class="text-surface-500"
        >{{ field.description }}</small>
      </div>

      <div
        v-else-if="isAssetRef(field)"
        class="flex flex-col gap-1"
      >
        <label class="text-sm font-medium">
          {{ field.title }}
          <span
            v-if="field.required"
            class="text-red-500"
          >*</span>
        </label>
        <small
          v-if="field.description"
          class="text-surface-500"
        >{{ field.description }}</small>
        <Select
          :model-value="getAssetValue(field.key)"
          :options="imageAssets"
          option-label="name"
          option-value="id"
          placeholder="None"
          show-clear
          fluid
          @update:model-value="setValue(field.key, $event ?? null)"
        />
      </div>

      <div
        v-else
        class="flex flex-col gap-1"
      >
        <label class="text-sm font-medium">{{ field.title }}</label>
        <small class="text-surface-500">Type '{{ field.type }}' — edit as JSON</small>
        <InputText
          :model-value="JSON.stringify(getValue(field.key) ?? '')"
          disabled
          fluid
        />
      </div>
    </template>
  </div>
</template>
