import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { generateOrFetchSummary } from '../shared/summary.js';

let callCount = 0;

describe('generateOrFetchSummary', () => {
  beforeEach(() => {
    callCount = 0;
    global.fetch = async () => {
      callCount += 1;
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'result' } }] }),
      };
    };
  });

  afterEach(() => {
    delete global.fetch;
  });

  it('returns cached summary when present', async () => {
    const session = { summary: 'cached', history: [] };
    const env = { MEDIA_BUCKET: { list: async () => ({}) } };
    const res = await generateOrFetchSummary({ env, session, phone: '1' });
    assert.strictEqual(res, 'cached');
    assert.strictEqual(callCount, 0);
  });

  it('calls GPT and appends photo URLs', async () => {
    const env = {
      MEDIA_BUCKET: { list: async () => ({ objects: [{ key: 'a.jpg' }] }) },
      OPENAI_API_KEY: 'k'
    };
    const session = { history: [] };
    const res = await generateOrFetchSummary({ env, session, phone: '1', baseUrl: 'http://x' });
    assert.strictEqual(callCount, 1);
    assert.ok(res.includes('Photos Provided: http://x/images/a.jpg'));
  });
});
