import { buildPrompt } from '../shared/prompt-builder.js';

describe('buildPrompt', () => {
  test('joins title and chunks', () => {
    const out = buildPrompt({ title: 'Doc', chunks: ['A', 'B'] });
    expect(out).toContain('Here is the content of Doc:');
    expect(out).toContain('A');
    expect(out).toContain('B');
  });
});
