<script setup lang="ts">
import type { Element, ModuleRecord, ModulePk, LayerId, JsonSchemaLike } from 'engine-core';

const props = defineProps<{
  element?: Element | null;
  modules: ModuleRecord[];
  layerId: LayerId;
}>();

const emit = defineEmits<{
  submit: [data: { name: string; moduleId: ModulePk; layerId: LayerId; sortOrder: number; config: unknown }];
  cancel: [];
}>();

const isEdit = computed(() => !!props.element);

const state = reactive({
  name: props.element?.name ?? '',
  moduleId: props.element?.moduleId ?? (props.modules[0]?.id ?? 0),
  sortOrder: props.element?.sortOrder ?? 0,
  config: (props.element?.config ?? {}) as Record<string, unknown>
});

const selectedModule = computed(() =>
  props.modules.find((m) => m.id === state.moduleId)
);

const configSchema = computed<JsonSchemaLike>(() =>
  selectedModule.value?.configSchema ?? { type: 'object', properties: {} }
);

watch(() => state.moduleId, (newId, oldId) => {
  if (!isEdit.value && newId !== oldId) {
    const mod = props.modules.find((m) => m.id === newId);
    if (mod?.configSchema) {
      const defaults: Record<string, unknown> = {};
      const properties = (mod.configSchema.properties ?? {}) as Record<string, Record<string, unknown>>;
      for (const [key, prop] of Object.entries(properties)) {
        if (prop.default !== undefined) {
          defaults[key] = prop.default;
        }
      }
      state.config = defaults;
    } else {
      state.config = {};
    }
  }
});

const moduleItems = computed(() =>
  props.modules.map((m) => ({ label: m.label, value: m.id }))
);

function handleSubmit() {
  if (!state.name.trim()) return;
  emit('submit', {
    name: state.name.trim(),
    moduleId: state.moduleId,
    layerId: props.layerId,
    sortOrder: state.sortOrder,
    config: state.config
  });
}
</script>

<template>
  <UForm :state="state" @submit="handleSubmit" class="flex flex-col gap-4">
    <UFormField label="Name" name="name" required>
      <UInput v-model="state.name" placeholder="e.g. Guest Lower Third" class="w-full" autofocus />
    </UFormField>

    <UFormField label="Module" name="moduleId" required>
      <USelect v-model="state.moduleId" :items="moduleItems" value-key="value" class="w-full" :disabled="isEdit" />
    </UFormField>

    <UFormField label="Sort Order" name="sortOrder" help="Position in the rundown">
      <UInput v-model.number="state.sortOrder" type="number" class="w-full" />
    </UFormField>

    <fieldset v-if="selectedModule" class="border border-gray-200 dark:border-gray-700 rounded-md p-3">
      <legend class="text-sm font-medium px-1">{{ selectedModule.label }} Configuration</legend>
      <ProducerConfigForm v-model="state.config" :schema="configSchema" />
    </fieldset>

    <div class="flex justify-end gap-2 pt-2">
      <UButton label="Cancel" color="neutral" variant="ghost" @click="emit('cancel')" />
      <UButton :label="isEdit ? 'Save' : 'Create'" type="submit" />
    </div>
  </UForm>
</template>
