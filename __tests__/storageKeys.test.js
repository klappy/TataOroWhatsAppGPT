import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { chatHistoryKey, mediaPrefix, normalizePhoneNumber } from '../shared/storageKeys.js';

describe('normalizePhoneNumber', () => {
  it('strips whatsapp prefix and whitespace', () => {
    assert.strictEqual(normalizePhoneNumber(' whatsapp:+1234567890 '), '+1234567890');
    assert.strictEqual(normalizePhoneNumber('whatsapp:whatsapp:+1987'), '+1987');
  });

  it('throws on invalid numbers', () => {
    assert.throws(() => normalizePhoneNumber('12345'), /invalid phone/);
  });
});

describe('chatHistoryKey & mediaPrefix', () => {
  it('builds consistent keys', () => {
    const phone = 'whatsapp:+1555';
    assert.strictEqual(chatHistoryKey('whatsapp', phone), 'whatsapp:+1555/history.json');
    assert.strictEqual(mediaPrefix('whatsapp', phone), 'whatsapp:+1555/');
  });
});
