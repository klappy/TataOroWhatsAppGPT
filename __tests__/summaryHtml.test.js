import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderSummaryHTML } from '../shared/summary.js';

describe('renderSummaryHTML', () => {
  it('renders history and images', () => {
    const session = {
      history: [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello' }
      ],
      summary: 'done',
      progress_status: 'summary-ready',
      last_active: 0
    };
    const html = renderSummaryHTML({
      session,
      mediaObjects: [{ key: 'a.jpg' }],
      baseUrl: 'http://x'
    });
    assert.ok(/Consultation Summary/.test(html));
    assert.ok(/hi/.test(html));
    assert.ok(/http:\/\/x\/images\/a.jpg/.test(html));
  });
});
