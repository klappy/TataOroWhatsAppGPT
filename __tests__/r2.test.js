import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { r2KeyFromUrl, deleteR2Objects } from '../shared/r2.js';

describe('r2 helpers', () => {
  it('extracts key from URL', () => {
    const url = 'https://wa.example.com/images/a%2Fb.jpg';
    assert.strictEqual(r2KeyFromUrl(url), 'a/b.jpg');
  });

  it('deletes keys from bucket', async () => {
    const deleted = [];
    const env = { MEDIA_BUCKET: { delete: async key => { deleted.push(key); } } };
    await deleteR2Objects(env, ['a.jpg', 'b.jpg']);
    assert.deepStrictEqual(deleted, ['a.jpg', 'b.jpg']);
  });

  it('extracts full key with phone prefix from URL', () => {
    const key = 'whatsapp:+14232807430/1747559515643-0.jpeg';
    const url = `https://wa.example.com/images/${encodeURIComponent(key)}`;
    assert.strictEqual(r2KeyFromUrl(url), key);
  });
});
