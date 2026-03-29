<script setup lang="ts">
import { moduleComponents } from 'modules/registry';
import type {
  Workspace,
  Channel,
  Layer,
  Element,
  ModuleRecord,
  LayerState,
  ResolvedFont,
} from 'engine-core';

const props = defineProps<{
  workspaceId: number;
  channelId: number;
  filterLayerId?: number;
  filterElementId?: number;
}>();

// Fetch metadata
const { data: workspace } = await useFetch<Workspace>(`/api/workspaces/${props.workspaceId}`);
const { data: channel } = await useFetch<Channel>(
  `/api/workspaces/${props.workspaceId}/channels/${props.channelId}`
);
const { data: layerList } = await useFetch<Layer[]>(
  `/api/workspaces/${props.workspaceId}/channels/${props.channelId}/layers`
);
const { data: elementList, refresh: refreshElements } = await useFetch<Element[]>(
  `/api/workspaces/${props.workspaceId}/channels/${props.channelId}/elements`
);
const { data: moduleList } = await useFetch<ModuleRecord[]>('/api/modules');

// Build lookup maps
const layerMap = computed(() => {
  const m = new Map<number, Layer>();
  for (const l of layerList.value ?? []) m.set(l.id, l);
  return m;
});

const elementMap = computed(() => {
  const m = new Map<number, Element>();
  for (const e of elementList.value ?? []) m.set(e.id, e);
  return m;
});

const moduleKeyById = computed(() => {
  const m = new Map<number, string>();
  for (const mod of moduleList.value ?? []) m.set(mod.id, mod.moduleKey);
  return m;
});

// Connect to WebSocket for live state
const { channelState, subscribe: wsSubscribe } = useEngineWs();
onMounted(() => wsSubscribe(props.workspaceId, props.channelId));

// Refetch elements when state updates (config may have changed)
watch(channelState, () => {
  refreshElements();
});

// Filter layers based on scope
const visibleLayers = computed<LayerState[]>(() => {
  if (!channelState.value) return [];
  let layers = channelState.value.layers;

  if (props.filterLayerId) {
    layers = layers.filter((l) => l.layerId === props.filterLayerId);
  }

  if (props.filterElementId) {
    layers = layers.map((l) => ({
      ...l,
      elements: l.elements.filter((e) => e.elementId === props.filterElementId),
    })).filter((l) => l.elements.length > 0);
  }

  return layers;
});

// Resolve module component by key (cache avoids re-creating async wrappers)
const componentCache = new Map<string, ReturnType<typeof defineAsyncComponent>>();

function getModuleComponent(moduleKey: string) {
  if (!moduleKey) return null;
  if (componentCache.has(moduleKey)) return componentCache.get(moduleKey)!;
  const loader = moduleComponents[moduleKey];
  if (!loader) return null;
  const comp = defineAsyncComponent(loader);
  componentCache.set(moduleKey, comp);
  return comp;
}

// Pre-resolve components in reactive context (not during render) to avoid
// calling defineAsyncComponent from the template and the double-evaluation
// that causes the null component-effect ('ce') crash.
const resolvedComponents = computed(() => {
  const map = new Map<number, ReturnType<typeof defineAsyncComponent>>();
  for (const layerState of visibleLayers.value) {
    for (const elState of layerState.elements) {
      const el = elementMap.value.get(elState.elementId);
      if (!el) continue;
      const moduleKey = moduleKeyById.value.get(el.moduleId) ?? '';
      const comp = getModuleComponent(moduleKey);
      if (comp) map.set(elState.elementId, comp);
    }
  }
  return map;
});

// Theme token injection
const themeVars = computed(() => {
  if (!workspace.value) return {};
  const style: Record<string, string> = {};
  for (const [key, val] of Object.entries(workspace.value.themeTokens)) {
    style[key] = val;
  }
  return style;
});

// Font face injection
type WorkspaceWithFonts = Workspace & { resolvedFonts?: ResolvedFont[] };

const fontFaceCss = computed(() => {
  const ws = workspace.value as WorkspaceWithFonts | null;
  if (!ws?.resolvedFonts?.length) return '';

  return ws.resolvedFonts.map((font) => {
    if (font.isVariable) {
      return `@font-face {
  font-family: '${font.family}';
  src: url('/api/fonts/${font.slug}/variable.woff2') format('woff2');
  font-weight: 1 999;
  font-display: block;
}`;
    }
    return (font.weights ?? [400]).map((w) => `@font-face {
  font-family: '${font.family}';
  src: url('/api/fonts/${font.slug}/${w}.woff2') format('woff2');
  font-weight: ${w};
  font-display: block;
}`).join('\n');
  }).join('\n');
});

// Inject dynamic font styles via <head>
useHead({
  style: computed(() =>
    fontFaceCss.value ? [{ innerHTML: fontFaceCss.value }] : []
  ),
});
</script>

<template>
  <div class="overlay-host" :style="themeVars">
    <template v-for="layerState in visibleLayers" :key="layerState.layerId">
      <div
        class="overlay-layer"
        :style="{ zIndex: layerMap.get(layerState.layerId)?.zIndex ?? 0 }"
      >
        <template v-for="elState in layerState.elements" :key="elState.elementId">
          <component
            v-if="resolvedComponents.get(elState.elementId)"
            :is="resolvedComponents.get(elState.elementId)!"
            :workspace="workspace!"
            :channel="channel!"
            :layer="layerMap.get(layerState.layerId)!"
            :element="elementMap.get(elState.elementId)!"
            :config="elementMap.get(elState.elementId)?.config"
            :runtime-state="elState"
          />
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
.overlay-host {
  position: relative;
  width: 100%;
  height: 100%;
}
.overlay-layer {
  position: absolute;
  inset: 0;
}
</style>
