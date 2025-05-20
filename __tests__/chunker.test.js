import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { chunkText } from '../shared/chunker.js';

describe('chunkText', () => {
  it('splits text into roughly equal chunks', () => {
    const text = 'a'.repeat(50) + ' ' + 'b'.repeat(50);
    const chunks = chunkText(text, 10); // approx 40 chars per chunk
    assert.ok(chunks.length > 1);
    for (const c of chunks) {
      assert.ok(c.length <= 41); // 10 * 4 + 1
    }
    assert.ok(chunks.join(' ').includes('a'));
    assert.ok(chunks.join(' ').includes('b'));
  });
});
