import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPrompt } from '../shared/prompt-builder.js';

describe('buildPrompt', () => {
  it('joins title and chunks', () => {
    const out = buildPrompt({ title: 'Doc', chunks: ['A', 'B'] });
    assert.ok(out.includes('Here is the content of Doc:'));
    assert.ok(out.includes('A'));
    assert.ok(out.includes('B'));
  });
});
