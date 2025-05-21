import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { handleWhatsAppRequest } from '../workers/whatsapp-incoming.js';

let captured;

function makeRequest() {
  const params = new URLSearchParams({ From: 'whatsapp:+1234567890', Body: 'hi', NumMedia: '0' });
  return new Request('https://wa.tataoro.com/whatsapp/incoming', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
}

describe('phone injection into system prompt', () => {
  beforeEach(() => {
    global.fetch = async (url, opts) => {
      if (/openai/.test(url)) {
        captured = JSON.parse(opts.body).messages;
        return { ok: true, json: async () => ({ choices: [{ message: { content: 'ok' } }] }) };
      }
      return { ok: true };
    };
  });
  afterEach(() => { delete global.fetch; captured = null; });

  it('includes normalized phone in system prompt', async () => {
    const env = {
      OPENAI_API_KEY: 'k',
      TWILIO_ACCOUNT_SID: 'id',
      TWILIO_AUTH_TOKEN: 'tok',
      CHAT_HISTORY: { get: async () => null, put: async () => {} },
      MEDIA_BUCKET: { put: async () => {}, list: async () => ({ objects: [] }) }
    };
    const ctx = { waitUntil() {} };
    await handleWhatsAppRequest(makeRequest(), env, ctx);
    assert.ok(captured[0].content.includes('whatsapp:%2B1234567890'));
    assert.ok(!captured[0].content.includes('{{USER_PHONE}}'));
  });

  it('injects stored summary and link into GPT context', async () => {
    const env = {
      OPENAI_API_KEY: 'k',
      TWILIO_ACCOUNT_SID: 'id',
      TWILIO_AUTH_TOKEN: 'tok',
      CHAT_HISTORY: {
        get: async () => ({ history: [], summary: 'past summary', progress_status: 'summary-ready' }),
        put: async () => {},
      },
      MEDIA_BUCKET: { put: async () => {}, list: async () => ({ objects: [] }) },
    };
    const ctx = { waitUntil() {} };
    await handleWhatsAppRequest(makeRequest(), env, ctx);
    assert.strictEqual(captured[1].role, 'assistant');
    assert.strictEqual(captured[1].content, 'past summary');
    assert.ok(captured[2].content.includes('/summary/whatsapp:+1234567890'));
  });
});
