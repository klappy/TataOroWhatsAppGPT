import { chatCompletion } from '../shared/gpt.js';

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ choices: [{ message: { content: ' hi ' } }] }),
  });
});

afterEach(() => {
  jest.resetAllMocks();
});

describe('chatCompletion', () => {
  test('calls OpenAI API and trims response', async () => {
    const messages = [{ role: 'user', content: 'hello' }];
    const result = await chatCompletion(messages, 'k');
    expect(fetch).toHaveBeenCalled();
    expect(result).toBe('hi');
  });
});
