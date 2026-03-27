import { listElementsByChannel } from 'engine-core';

export default defineEventHandler((event) => {
  const channelId = Number(getRouterParam(event, 'channelId'));
  return listElementsByChannel(useDb(), channelId);
});
