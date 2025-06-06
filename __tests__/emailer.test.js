import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { sendConsultationEmail } from '../shared/emailer.js';

let fetchCalls = [];

describe('sendConsultationEmail', () => {
  beforeEach(() => {
    global.fetch = async (...args) => {
      fetchCalls.push(args);
      return { ok: true };
    };
  });

  afterEach(() => {
    fetchCalls = [];
    delete global.fetch;
  });

  it('does nothing when EMAIL_ENABLED is false', async () => {
    await sendConsultationEmail({ env: { EMAIL_ENABLED: 'false' }, phone: '1', summary: 's' });
    assert.strictEqual(fetchCalls.length, 0);
  });

  it('does nothing when provider unsupported', async () => {
    const env = { EMAIL_ENABLED: 'true', EMAIL_PROVIDER: 'other' };
    await sendConsultationEmail({ env, phone: '1', summary: 's' });
    assert.strictEqual(fetchCalls.length, 0);
  });

  it('sends email via Resend', async () => {
    const env = {
      EMAIL_ENABLED: 'true',
      EMAIL_PROVIDER: 'resend',
      RESEND_API_KEY: 'k',
      EMAIL_FROM: 'a@a.com',
      EMAIL_TO: 'b@b.com',
      WHATSAPP_BASE_URL: 'http://x'
    };
    await sendConsultationEmail({
      env,
      phone: '1',
      summary: 's',
      history: [{ role: 'user', content: 'hi' }],
      r2Urls: ['http://x/images/a.jpg']
    });
    assert.strictEqual(fetchCalls.length, 1);
    assert.strictEqual(fetchCalls[0][0], 'https://api.resend.com/emails');
    const body = JSON.parse(fetchCalls[0][1].body);
    assert.ok(/hi/.test(body.html));
    assert.ok(/http:\/\/x\/images\/a.jpg/.test(body.html));
  });
});
