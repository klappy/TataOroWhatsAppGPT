import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderAdminSessionHTML } from '../shared/summary.js';

describe('renderAdminSessionHTML', () => {
  it('renders messages and summary', () => {
    const session = {
      history: [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello' }
      ],
      summary: 'done',
      progress_status: 'summary-ready',
      last_active: 0,
      name: 'Tata',
      email: 'tata@example.com'
    };
    const html = renderAdminSessionHTML({ session, mediaObjects: [{ key: 'a.jpg' }], baseUrl: 'http://x', phone: '+1' });
    assert.ok(/hi/.test(html));
    assert.ok(/hello/.test(html));
    assert.ok(/done/.test(html));
    assert.ok(/http:\/\/x\/images\/a.jpg/.test(html));
    assert.ok(/Tata/.test(html));
    assert.ok(/tata@example.com/.test(html));
  });
});

