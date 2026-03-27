import { listLayers } from 'engine-core';

export default defineEventHandler((event) => {
  const channelId = Number(getRouterParam(event, 'channelId'));
  return listLayers(useDb(), channelId);
});
