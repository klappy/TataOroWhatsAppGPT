import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { chatCompletion } from '../shared/gpt.js';

let fetchCalls = [];

describe('chatCompletion', () => {
  beforeEach(() => {
    global.fetch = async (...args) => {
      fetchCalls.push(args);
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: ' hi ' } }] }),
      };
    };
  });

  afterEach(() => {
    fetchCalls = [];
    delete global.fetch;
  });

  it('calls OpenAI API and trims response', async () => {
    const messages = [{ role: 'user', content: 'hello' }];
    const result = await chatCompletion(messages, 'k');
    assert.strictEqual(fetchCalls.length, 1);
    assert.strictEqual(result, 'hi');
  });
});
