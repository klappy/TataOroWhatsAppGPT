import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { upsertShopifyCustomer } from '../shared/shopify.js';

let fetchCalls = [];

describe('upsertShopifyCustomer', () => {
  beforeEach(() => {
    global.fetch = async (...args) => {
      fetchCalls.push(args);
      return { ok: true };
    };
  });

  afterEach(() => {
    fetchCalls = [];
    delete global.fetch;
  });

  it('skips when config missing', async () => {
    await upsertShopifyCustomer({ env: {}, firstName: 'A', phone: '1' });
    assert.strictEqual(fetchCalls.length, 0);
  });

  it('posts to Shopify when config provided', async () => {
    const env = { SHOPIFY_STORE_DOMAIN: 'x', SHOPIFY_API_TOKEN: 't' };
    await upsertShopifyCustomer({ env, firstName: 'A', phone: '1' });
    assert.strictEqual(fetchCalls.length, 1);
  });
});
