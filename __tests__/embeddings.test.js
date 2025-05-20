import { embedText } from '../shared/embeddings.js';

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: [{ embedding: [1, 2, 3] }] }),
    text: async () => ''
  });
});

afterEach(() => {
  jest.resetAllMocks();
});

describe('embedText', () => {
  test('returns embeddings from API', async () => {
    const res = await embedText(['a'], 'k');
    expect(fetch).toHaveBeenCalled();
    expect(res).toEqual([[1, 2, 3]]);
  });

  test('throws on non-ok response', async () => {
    fetch.mockResolvedValueOnce({ ok: false, text: async () => 'bad' });
    await expect(embedText(['a'], 'k')).rejects.toThrow('OpenAI Embeddings API error: bad');
  });
});
