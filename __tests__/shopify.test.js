import { upsertShopifyCustomer } from '../shared/shopify.js';

describe('upsertShopifyCustomer', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('skips when config missing', async () => {
    await upsertShopifyCustomer({ env: {}, firstName: 'A', phone: '1' });
    expect(fetch).not.toHaveBeenCalled();
  });

  test('posts to Shopify when config provided', async () => {
    const env = { SHOPIFY_STORE_DOMAIN: 'x', SHOPIFY_API_TOKEN: 't' };
    await upsertShopifyCustomer({ env, firstName: 'A', phone: '1' });
    expect(fetch).toHaveBeenCalled();
  });
});
