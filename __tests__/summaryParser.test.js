import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractSummaryFromReply } from '../shared/summary.js';

describe('extractSummaryFromReply', () => {
  it('detects and stores summary', () => {
    const session = { progress_status: 'midway' };
    const reply = '**Client Curl Discovery Summary for Tata Oro**\nDone';
    const result = extractSummaryFromReply(reply, session);
    assert.strictEqual(result, true);
    assert.strictEqual(session.summary, reply);
    assert.strictEqual(session.progress_status, 'summary-ready');
  });

  it('returns false when summary missing', () => {
    const session = { progress_status: 'midway' };
    const reply = 'Hello world';
    const result = extractSummaryFromReply(reply, session);
    assert.strictEqual(result, false);
    assert.ok(!session.summary);
    assert.strictEqual(session.progress_status, 'midway');
  });
});
