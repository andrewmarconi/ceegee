<script setup lang="ts">
import type { Workspace, ModuleRecord, ThemeTokenDef } from 'engine-core'

const props = defineProps<{
  workspace?: Workspace | null
  modules?: ModuleRecord[]
}>()

const emit = defineEmits<{
  submit: [data: { name: string, description: string, themeTokens: Record<string, string> }]
  cancel: []
}>()

const state = reactive({
  name: props.workspace?.name ?? '',
  description: props.workspace?.description ?? '',
})

const tokenValues = reactive<Record<string, string>>(
  props.workspace?.themeTokens
    ? { ...props.workspace.themeTokens }
    : {}
)

const isEdit = computed(() => !!props.workspace)

const GLOBAL_TOKENS: ThemeTokenDef[] = [
  { key: '--overlay-font-family-primary', label: 'Primary Font Family', type: 'text', default: 'sans-serif' },
  { key: '--overlay-font-family-secondary', label: 'Secondary Font Family', type: 'text', default: 'sans-serif' },
]

const modulesWithTokens = computed(() =>
  (props.modules ?? []).filter(m => m.themeTokens && m.themeTokens.length > 0)
)

function getTokenValue(key: string): string {
  return tokenValues[key] ?? ''
}

function setTokenValue(key: string, value: string) {
  if (value === '') {
    delete tokenValues[key]
  } else {
    tokenValues[key] = value
  }
}

function getTokenNumberValue(key: string): number | null {
  const v = tokenValues[key]
  return v !== undefined && v !== '' ? Number(v) : null
}

function setTokenNumberValue(key: string, value: number | null) {
  if (value === null) {
    delete tokenValues[key]
  } else {
    tokenValues[key] = String(value)
  }
}

function handleSubmit() {
  if (!state.name.trim()) return
  emit('submit', {
    name: state.name.trim(),
    description: state.description.trim(),
    themeTokens: { ...tokenValues },
  })
}
</script>

<template>
  <form
    class="flex flex-col gap-4"
    @submit.prevent="handleSubmit"
  >
    <TabView>
      <TabPanel header="General">
        <div class="flex flex-col gap-4 pt-2">
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
        </div>
      </TabPanel>

      <TabPanel header="Global Styles">
        <div class="flex flex-col gap-4 pt-2">
          <div
            v-for="token in GLOBAL_TOKENS"
            :key="token.key"
            class="flex flex-col gap-1"
          >
            <label class="text-sm font-medium">{{ token.label }}</label>
            <InputText
              :model-value="getTokenValue(token.key)"
              :placeholder="token.default"
              fluid
              @update:model-value="setTokenValue(token.key, $event)"
            />
          </div>
        </div>
      </TabPanel>

      <TabPanel header="Module Styles">
        <div class="flex flex-col gap-4 pt-2">
          <div
            v-if="modulesWithTokens.length === 0"
            class="text-sm text-surface-400 py-2"
          >
            No modules define style tokens.
          </div>

          <Fieldset
            v-for="mod in modulesWithTokens"
            :key="mod.id"
            :legend="mod.label"
            toggleable
            :collapsed="true"
          >
            <div class="flex flex-col gap-3">
              <div
                v-for="token in mod.themeTokens"
                :key="token.key"
                class="flex flex-col gap-1"
              >
                <label class="text-sm font-medium">{{ token.label }}</label>

                <InputText
                  v-if="token.type === 'text'"
                  :model-value="getTokenValue(token.key)"
                  :placeholder="token.default"
                  fluid
                  @update:model-value="setTokenValue(token.key, $event)"
                />

                <InputNumber
                  v-else-if="token.type === 'number'"
                  :model-value="getTokenNumberValue(token.key)"
                  :placeholder="token.default"
                  fluid
                  @update:model-value="setTokenNumberValue(token.key, $event)"
                />

                <Select
                  v-else-if="token.type === 'dropdown'"
                  :model-value="getTokenValue(token.key) || undefined"
                  :options="token.options"
                  :placeholder="token.default"
                  show-clear
                  fluid
                  @update:model-value="setTokenValue(token.key, $event ?? '')"
                />
              </div>
            </div>
          </Fieldset>
        </div>
      </TabPanel>
    </TabView>

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
