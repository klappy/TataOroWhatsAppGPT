import { generateOrFetchSummary } from '../shared/summary.js';
import * as gpt from '../shared/gpt.js';

describe('generateOrFetchSummary', () => {
  beforeEach(() => {
    jest.spyOn(gpt, 'chatCompletion').mockResolvedValue('result');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns cached summary when present', async () => {
    const session = { summary: 'cached', history: [] };
    const env = { MEDIA_BUCKET: { list: jest.fn() } };
    const res = await generateOrFetchSummary({ env, session, phone: '1' });
    expect(res).toBe('cached');
    expect(gpt.chatCompletion).not.toHaveBeenCalled();
  });

  test('calls GPT and appends photo URLs', async () => {
    const env = {
      MEDIA_BUCKET: { list: jest.fn().mockResolvedValue({ objects: [{ key: 'a.jpg' }] }) },
      OPENAI_API_KEY: 'k'
    };
    const session = { history: [] };
    const res = await generateOrFetchSummary({ env, session, phone: '1', baseUrl: 'http://x' });
    expect(gpt.chatCompletion).toHaveBeenCalled();
    expect(res).toContain('Photos Provided: http://x/images/a.jpg');
  });
});
