import { SYSTEM_PROMPT } from '../shared/systemPrompt.js';

describe('SYSTEM_PROMPT', () => {
  test('contains key background', () => {
    expect(SYSTEM_PROMPT).toMatch(/Tata Oro/);
  });
});
