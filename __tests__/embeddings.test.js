import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { embedText } from '../shared/embeddings.js';

let fetchCalls = [];
let currentResponse;

describe('embedText', () => {
  beforeEach(() => {
    currentResponse = {
      ok: true,
      json: async () => ({ data: [{ embedding: [1, 2, 3] }] }),
      text: async () => ''
    };
    global.fetch = async (...args) => {
      fetchCalls.push(args);
      return currentResponse;
    };
  });

  afterEach(() => {
    fetchCalls = [];
    delete global.fetch;
  });

  it('returns embeddings from API', async () => {
    const res = await embedText(['a'], 'k');
    assert.strictEqual(fetchCalls.length, 1);
    assert.deepStrictEqual(res, [[1, 2, 3]]);
  });

  it('throws on non-ok response', async () => {
    currentResponse = { ok: false, text: async () => 'bad' };
    try {
      await embedText(['a'], 'k');
      assert.fail('Expected error');
    } catch (err) {
      assert.strictEqual(err.message, 'OpenAI Embeddings API error: bad');
    }
  });
});
