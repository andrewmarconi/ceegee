import type {
  Channel,
  CreateChannelInput,
  UpdateChannelInput,
  Layer,
  CreateLayerInput,
  UpdateLayerInput,
  Element,
  CreateElementInput,
  UpdateElementInput,
  ModuleRecord,
  Asset,
  WorkspaceId,
  ChannelId,
  LayerId,
  ElementId,
  AssetId
} from 'engine-core';

export function useProducerApi(workspaceId: Ref<WorkspaceId>) {
  const basePath = computed(() => `/api/workspaces/${workspaceId.value}`);

  // -- Channels --

  function listChannels(): Promise<Channel[]> {
    return $fetch<Channel[]>(`${basePath.value}/channels`);
  }

  function createChannel(input: Omit<CreateChannelInput, 'workspaceId'>): Promise<Channel> {
    return $fetch<Channel>(`${basePath.value}/channels`, {
      method: 'POST',
      body: input
    });
  }

  function updateChannel(channelId: ChannelId, input: UpdateChannelInput): Promise<Channel> {
    return $fetch<Channel>(`${basePath.value}/channels/${channelId}`, {
      method: 'PUT',
      body: input
    });
  }

  function deleteChannel(channelId: ChannelId): Promise<void> {
    return $fetch(`${basePath.value}/channels/${channelId}`, { method: 'DELETE' });
  }

  // -- Layers --

  function listLayers(channelId: ChannelId): Promise<Layer[]> {
    return $fetch<Layer[]>(`${basePath.value}/channels/${channelId}/layers`);
  }

  function createLayer(channelId: ChannelId, input: Omit<CreateLayerInput, 'workspaceId' | 'channelId'>): Promise<Layer> {
    return $fetch<Layer>(`${basePath.value}/channels/${channelId}/layers`, {
      method: 'POST',
      body: input
    });
  }

  function updateLayer(channelId: ChannelId, layerId: LayerId, input: UpdateLayerInput): Promise<Layer> {
    return $fetch<Layer>(`${basePath.value}/channels/${channelId}/layers/${layerId}`, {
      method: 'PUT',
      body: input
    });
  }

  function deleteLayer(channelId: ChannelId, layerId: LayerId): Promise<void> {
    return $fetch(`${basePath.value}/channels/${channelId}/layers/${layerId}`, { method: 'DELETE' });
  }

  // -- Elements --

  function listElements(channelId: ChannelId, layerId: LayerId): Promise<Element[]> {
    return $fetch<Element[]>(`${basePath.value}/channels/${channelId}/elements`).then(
      (elements) => elements.filter((e) => e.layerId === layerId)
    );
  }

  function listElementsByChannel(channelId: ChannelId): Promise<Element[]> {
    return $fetch<Element[]>(`${basePath.value}/channels/${channelId}/elements`);
  }

  function createElement(channelId: ChannelId, input: Omit<CreateElementInput, 'workspaceId' | 'channelId'>): Promise<Element> {
    return $fetch<Element>(`${basePath.value}/channels/${channelId}/elements`, {
      method: 'POST',
      body: input
    });
  }

  function updateElement(channelId: ChannelId, elementId: ElementId, input: UpdateElementInput): Promise<Element> {
    return $fetch<Element>(`${basePath.value}/channels/${channelId}/elements/${elementId}`, {
      method: 'PUT',
      body: input
    });
  }

  function deleteElement(channelId: ChannelId, elementId: ElementId): Promise<void> {
    return $fetch(`${basePath.value}/channels/${channelId}/elements/${elementId}`, { method: 'DELETE' });
  }

  async function reorderElements(channelId: ChannelId, elementIds: ElementId[]): Promise<void> {
    for (let i = 0; i < elementIds.length; i++) {
      await updateElement(channelId, elementIds[i], { sortOrder: i });
    }
  }

  // -- Modules --

  function listModules(): Promise<ModuleRecord[]> {
    return $fetch<ModuleRecord[]>('/api/modules');
  }

  // -- Assets --

  function listAssets(): Promise<Asset[]> {
    return $fetch<Asset[]>(`${basePath.value}/assets`);
  }

  function uploadAsset(file: File): Promise<Asset> {
    const formData = new FormData();
    formData.append('file', file);
    return $fetch<Asset>(`${basePath.value}/assets`, {
      method: 'POST',
      body: formData
    });
  }

  function deleteAsset(assetId: AssetId): Promise<void> {
    return $fetch(`${basePath.value}/assets/${assetId}`, { method: 'DELETE' });
  }

  function getAssetFileUrl(assetId: AssetId): string {
    return `${basePath.value}/assets/${assetId}/file`;
  }

  return {
    listChannels, createChannel, updateChannel, deleteChannel,
    listLayers, createLayer, updateLayer, deleteLayer,
    listElements, listElementsByChannel, createElement, updateElement, deleteElement, reorderElements,
    listModules,
    listAssets, uploadAsset, deleteAsset, getAssetFileUrl
  };
}
