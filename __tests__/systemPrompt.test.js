import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SYSTEM_PROMPT } from '../shared/systemPrompt.js';

describe('SYSTEM_PROMPT', () => {
  it('contains key background', () => {
    assert.ok(/Tata Oro/.test(SYSTEM_PROMPT));
  });
});
