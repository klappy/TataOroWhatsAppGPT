import { chunkText } from '../shared/chunker.js';

describe('chunkText', () => {
  test('splits text into roughly equal chunks', () => {
    const text = 'a'.repeat(50) + ' ' + 'b'.repeat(50);
    const chunks = chunkText(text, 10); // approx 40 chars per chunk
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(41); // 10 * 4 + 1
    }
    expect(chunks.join(' ')).toContain('a');
    expect(chunks.join(' ')).toContain('b');
  });
});
