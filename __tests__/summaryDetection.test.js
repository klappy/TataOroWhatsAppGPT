import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { handleWhatsAppRequest } from '../workers/whatsapp-incoming.js';

function makeRequest() {
  const params = new URLSearchParams({ From: 'whatsapp:+1234567890', Body: 'hi', NumMedia: '0' });
  return new Request('https://wa.tataoro.com/whatsapp/incoming', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
}

describe('summary detection', () => {
  let saved;
  beforeEach(() => {
    global.fetch = async (url) => {
      if (/openai/.test(url)) {
        return {
          ok: true,
          json: async () => ({ choices: [{ message: { content: 'Client Curl Discovery Summary for Tata Oro\nDone' } }] })
        };
      }
      return { ok: true };
    };
    saved = null;
  });
  afterEach(() => { delete global.fetch; });

  it('stores summary and updates progress', async () => {
    const env = {
      OPENAI_API_KEY: 'k',
      TWILIO_ACCOUNT_SID: 'id',
      TWILIO_AUTH_TOKEN: 'tok',
      CHAT_HISTORY: {
        get: async () => ({ history: [], progress_status: 'midway' }),
        put: async (_key, val) => { saved = JSON.parse(val); }
      },
      MEDIA_BUCKET: { put: async () => {}, list: async () => ({ objects: [] }) }
    };
    const ctx = { waitUntil() {} };
    await handleWhatsAppRequest(makeRequest(), env, ctx);
    assert.strictEqual(saved.summary, 'Client Curl Discovery Summary for Tata Oro\nDone');
    assert.strictEqual(saved.progress_status, 'summary-ready');
  });
});
