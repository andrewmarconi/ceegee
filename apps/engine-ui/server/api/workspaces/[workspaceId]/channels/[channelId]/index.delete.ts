import { deleteChannel } from 'engine-core';

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'channelId'));
  deleteChannel(useDb(), id);
  return { ok: true };
});
