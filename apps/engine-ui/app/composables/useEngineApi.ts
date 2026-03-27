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
    return $fetch('/api/workspaces')
  }

  function getWorkspace(workspaceId: number): Promise<Workspace> {
    return $fetch(`/api/workspaces/${workspaceId}`)
  }

  function listChannels(workspaceId: number): Promise<Channel[]> {
    return $fetch(`/api/workspaces/${workspaceId}/channels`)
  }

  function listLayers(workspaceId: number, channelId: number): Promise<Layer[]> {
    return $fetch(`/api/workspaces/${workspaceId}/channels/${channelId}/layers`)
  }

  function listElements(workspaceId: number, channelId: number): Promise<Element[]> {
    return $fetch(`/api/workspaces/${workspaceId}/channels/${channelId}/elements`)
  }

  function listModules(): Promise<ModuleRecord[]> {
    return $fetch('/api/modules')
  }

  function updateElement(
    workspaceId: number,
    channelId: number,
    elementId: number,
    input: UpdateElementInput
  ): Promise<Element> {
    return $fetch(
      `/api/workspaces/${workspaceId}/channels/${channelId}/elements/${elementId}`,
      { method: 'PUT', body: input }
    )
  }

  function takeElement(
    workspaceId: number,
    channelId: number,
    elementId: number
  ): Promise<ChannelState> {
    return $fetch(
      `/api/workspaces/${workspaceId}/channels/${channelId}/elements/${elementId}/take`,
      { method: 'POST' }
    )
  }

  function clearElement(
    workspaceId: number,
    channelId: number,
    elementId: number
  ): Promise<ChannelState> {
    return $fetch(
      `/api/workspaces/${workspaceId}/channels/${channelId}/elements/${elementId}/clear`,
      { method: 'POST' }
    )
  }

  function elementAction(
    workspaceId: number,
    channelId: number,
    elementId: number,
    actionId: string,
    args?: unknown
  ): Promise<EngineEvent> {
    return $fetch(
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
    elementAction
  }
}
