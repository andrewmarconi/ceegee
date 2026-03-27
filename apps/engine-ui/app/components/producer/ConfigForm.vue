<script setup lang="ts">
import type { JsonSchemaLike } from 'engine-core';

const props = defineProps<{
  schema: JsonSchemaLike;
  modelValue: Record<string, unknown>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>];
}>();

type SchemaProperty = {
  key: string;
  type: string;
  title: string;
  description?: string;
  enumValues?: string[];
  default?: unknown;
  properties?: Record<string, unknown>;
  required?: boolean;
};

const fields = computed<SchemaProperty[]>(() => {
  const properties = (props.schema.properties ?? {}) as Record<string, Record<string, unknown>>;
  const required = ((props.schema.required ?? []) as string[]);

  return Object.entries(properties).map(([key, prop]) => ({
    key,
    type: (prop.type as string) ?? 'string',
    title: (prop.title as string) ?? key,
    description: prop.description as string | undefined,
    enumValues: prop.enum as string[] | undefined,
    default: prop.default,
    properties: prop.properties as Record<string, unknown> | undefined,
    required: required.includes(key)
  }));
});

function getValue(key: string): unknown {
  return props.modelValue[key];
}

function setValue(key: string, value: unknown) {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
}

function getStringValue(key: string): string {
  return (getValue(key) as string) ?? '';
}

function getNumberValue(key: string): number {
  return (getValue(key) as number) ?? 0;
}

function getBooleanValue(key: string): boolean {
  return (getValue(key) as boolean) ?? false;
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-if="fields.length === 0" class="text-sm text-gray-400 py-2">
      This module has no configuration options.
    </div>

    <template v-for="field in fields" :key="field.key">
      <UFormField
        v-if="field.type === 'string' && field.enumValues"
        :label="field.title"
        :name="field.key"
        :help="field.description"
        :required="field.required"
      >
        <USelect
          :model-value="getStringValue(field.key)"
          :items="field.enumValues"
          class="w-full"
          @update:model-value="setValue(field.key, $event)"
        />
      </UFormField>

      <UFormField
        v-else-if="field.type === 'string'"
        :label="field.title"
        :name="field.key"
        :help="field.description"
        :required="field.required"
      >
        <UInput
          :model-value="getStringValue(field.key)"
          class="w-full"
          @update:model-value="setValue(field.key, $event)"
        />
      </UFormField>

      <UFormField
        v-else-if="field.type === 'number' || field.type === 'integer'"
        :label="field.title"
        :name="field.key"
        :help="field.description"
        :required="field.required"
      >
        <UInput
          type="number"
          :model-value="getNumberValue(field.key)"
          class="w-full"
          @update:model-value="setValue(field.key, Number($event))"
        />
      </UFormField>

      <UFormField
        v-else-if="field.type === 'boolean'"
        :name="field.key"
        :help="field.description"
      >
        <UCheckbox
          :model-value="getBooleanValue(field.key)"
          :label="field.title"
          @update:model-value="setValue(field.key, $event)"
        />
      </UFormField>

      <UFormField
        v-else
        :label="field.title"
        :name="field.key"
        :help="`Type '${field.type}' — edit as JSON`"
      >
        <UInput
          :model-value="JSON.stringify(getValue(field.key) ?? '')"
          class="w-full"
          disabled
        />
      </UFormField>
    </template>
  </div>
</template>
