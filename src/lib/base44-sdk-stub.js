export function createClient(options = {}) {
  return {
    appId: options.appId,
    token: options.token,
    functionsVersion: options.functionsVersion,
    serverUrl: options.serverUrl,
    requiresAuth: options.requiresAuth,
    appBaseUrl: options.appBaseUrl,
    auth: {
      login: async () => ({ ok: true }),
      logout: async () => ({ ok: true }),
      me: async () => null,
    },
    entities: {},
    functions: {},
  };
}
