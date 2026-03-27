const startedAt = Date.now();

export default defineEventHandler(() => {
  return {
    status: 'ok',
    uptimeMs: Date.now() - startedAt,
    wsConnections: getWsConnectionCount()
  };
});
