import type { AppDatabase } from './db/connection';
import type {
  WorkspaceId,
  ChannelId,
  ElementId,
  ChannelState,
  LayerState,
  ElementRuntimeState,
  EngineEvent,
} from './types';
import { now } from './types';
import {
  listLayers,
  listElementsByChannel,
  listRuntimeStateByChannel,
  getElement,
  setRuntimeState,
  getRuntimeState,
} from './index';

export function buildChannelState(
  db: AppDatabase,
  workspaceId: WorkspaceId,
  channelId: ChannelId,
): ChannelState {
  const layers = listLayers(db, channelId);
  const allElements = listElementsByChannel(db, channelId);
  const allStates = listRuntimeStateByChannel(db, channelId);

  const stateByElement = new Map(allStates.map((s) => [s.elementId, s]));

  const layerStates: LayerState[] = layers.map((layer) => {
    const layerElements = allElements.filter((e) => e.layerId === layer.id);
    const elementStates: ElementRuntimeState[] = layerElements.map((el) => {
      const rs = stateByElement.get(el.id);
      return {
        elementId: el.id,
        visibility: rs?.visibility ?? 'hidden',
        runtimeData: rs?.runtimeData ?? {},
        updatedAt: rs?.updatedAt ?? now(),
      };
    });
    return { layerId: layer.id, elements: elementStates };
  });

  return { workspaceId, channelId, layers: layerStates };
}

export function take(
  db: AppDatabase,
  elementId: ElementId,
): ChannelState {
  const element = getElement(db, elementId);
  if (!element) throw new Error(`Element ${elementId} not found`);

  // Hide any currently visible element on the same layer
  const currentStates = listRuntimeStateByChannel(db, element.channelId);
  const allElements = listElementsByChannel(db, element.channelId);
  const sameLayerElementIds = new Set(
    allElements.filter((e) => e.layerId === element.layerId).map((e) => e.id),
  );

  for (const rs of currentStates) {
    if (sameLayerElementIds.has(rs.elementId) && rs.visibility === 'visible') {
      setRuntimeState(db, { elementId: rs.elementId, visibility: 'hidden' });
    }
  }

  // Show the target element
  setRuntimeState(db, { elementId, visibility: 'visible' });

  return buildChannelState(db, element.workspaceId, element.channelId);
}

export function clear(
  db: AppDatabase,
  elementId: ElementId,
): ChannelState {
  const element = getElement(db, elementId);
  if (!element) throw new Error(`Element ${elementId} not found`);

  setRuntimeState(db, { elementId, visibility: 'hidden' });

  return buildChannelState(db, element.workspaceId, element.channelId);
}

export function elementAction(
  db: AppDatabase,
  elementId: ElementId,
  actionId: string,
  args?: unknown,
): EngineEvent {
  const element = getElement(db, elementId);
  if (!element) throw new Error(`Element ${elementId} not found`);

  const existing = getRuntimeState(db, elementId);
  setRuntimeState(db, {
    elementId,
    visibility: existing?.visibility ?? 'hidden',
    runtimeData: { ...(existing?.runtimeData as object ?? {}), lastAction: { actionId, args, ts: now() } },
  });

  return {
    type: 'element:action',
    payload: {
      workspaceId: element.workspaceId,
      channelId: element.channelId,
      elementId,
      actionId,
      args,
    },
  };
}
