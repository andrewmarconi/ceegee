import type { EngineEvent } from 'engine-core';

type WsConnection = {
  peer: any;
  workspaceId: number;
  channelId: number;
};

const connections = new Map<string, WsConnection>();

export function addWsConnection(peer: any, workspaceId: number, channelId: number) {
  connections.set(peer.id ?? peer.toString(), { peer, workspaceId, channelId });
}

export function removeWsConnection(peer: any) {
  connections.delete(peer.id ?? peer.toString());
}

export function broadcastToChannel(workspaceId: number, channelId: number, event: EngineEvent) {
  const json = JSON.stringify(event);
  for (const conn of connections.values()) {
    if (conn.workspaceId === workspaceId && conn.channelId === channelId) {
      conn.peer.send(json);
    }
  }
}

export function getWsConnectionCount(): number {
  return connections.size;
}
