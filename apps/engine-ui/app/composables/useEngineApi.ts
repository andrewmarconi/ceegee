import type {
  Workspace,
  Channel,
  Layer,
  Element,
  ModuleRecord,
  ChannelState,
  UpdateElementInput,
  EngineEvent
} from 'engine-core'

export function useEngineApi() {
  function listWorkspaces(): Promise<Workspace[]> {
    return $fetch<Workspace[]>('/api/workspaces')
  }

  function getWorkspace(workspaceId: number): Promise<Workspace> {
    return $fetch<Workspace>(`/api/workspaces/${workspaceId}`)
  }

  function listChannels(workspaceId: number): Promise<Channel[]> {
    return $fetch<Channel[]>(`/api/workspaces/${workspaceId}/channels`)
  }

  function listLayers(workspaceId: number, channelId: number): Promise<Layer[]> {
    return $fetch<Layer[]>(`/api/workspaces/${workspaceId}/channels/${channelId}/layers`)
  }

  function listElements(workspaceId: number, channelId: number): Promise<Element[]> {
    return $fetch<Element[]>(`/api/workspaces/${workspaceId}/channels/${channelId}/elements`)
  }

  function listModules(): Promise<ModuleRecord[]> {
    return $fetch<ModuleRecord[]>('/api/modules')
  }

  function updateElement(
    workspaceId: number,
    channelId: number,
    elementId: number,
    input: UpdateElementInput
  ): Promise<Element> {
    return $fetch<Element>(
      `/api/workspaces/${workspaceId}/channels/${channelId}/elements/${elementId}`,
      { method: 'PUT', body: input }
    )
  }

  function takeElement(
    workspaceId: number,
    channelId: number,
    elementId: number
  ): Promise<ChannelState> {
    return $fetch<ChannelState>(
      `/api/workspaces/${workspaceId}/channels/${channelId}/elements/${elementId}/take`,
      { method: 'POST' }
    )
  }

  function clearElement(
    workspaceId: number,
    channelId: number,
    elementId: number
  ): Promise<ChannelState> {
    return $fetch<ChannelState>(
      `/api/workspaces/${workspaceId}/channels/${channelId}/elements/${elementId}/clear`,
      { method: 'POST' }
    )
  }

  function clearAllElements(
    workspaceId: number,
    channelId: number
  ): Promise<ChannelState> {
    return $fetch<ChannelState>(
      `/api/workspaces/${workspaceId}/channels/${channelId}/clear-all`,
      { method: 'POST' }
    )
  }

  function updateLayer(
    workspaceId: number,
    channelId: number,
    layerId: number,
    input: { locked?: boolean, name?: string, zIndex?: number }
  ): Promise<Layer> {
    return $fetch<Layer>(
      `/api/workspaces/${workspaceId}/channels/${channelId}/layers/${layerId}`,
      { method: 'PUT', body: input }
    )
  }

  function elementAction(
    workspaceId: number,
    channelId: number,
    elementId: number,
    actionId: string,
    args?: unknown
  ): Promise<EngineEvent> {
    return $fetch<EngineEvent>(
      `/api/workspaces/${workspaceId}/channels/${channelId}/elements/${elementId}/action`,
      { method: 'POST', body: { actionId, args } }
    )
  }

  return {
    listWorkspaces,
    getWorkspace,
    listChannels,
    listLayers,
    listElements,
    listModules,
    updateElement,
    takeElement,
    clearElement,
    clearAllElements,
    updateLayer,
    elementAction
  }
}
