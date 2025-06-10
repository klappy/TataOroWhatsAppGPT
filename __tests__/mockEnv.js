/**
 * Mock environment setup for Cloudflare Worker tests.
 * Provides mock implementations for environment variables, KV, R2, and other bindings.
 */

export function mockEnv() {
  return {
    OPENAI_API_KEY: "mock-openai-api-key",
    TWILIO_ACCOUNT_SID: "mock-twilio-sid",
    TWILIO_AUTH_TOKEN: "mock-twilio-token",
    CHAT_HISTORY: {
      get: async () => null,
      put: async () => undefined,
      delete: async () => undefined,
    },
    MEDIA_BUCKET: {
      put: async function (key, data, options) {
        this.lastKey = key;
        this.lastData = data;
        this.lastOptions = options;
        this.putCalled = true;
        return undefined;
      },
      list: async () => ({ objects: [] }),
      delete: async () => undefined,
      putCalled: false,
      lastKey: null,
      lastData: null,
      lastOptions: null,
    },
  };
}
