import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { upsertShopifyCustomer, searchShopifyProducts } from '../shared/shopify.js';

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

describe('searchShopifyProducts', () => {
  beforeEach(() => {
    global.fetch = async (...args) => {
      fetchCalls.push(args);
      return {
        ok: true,
        json: async () => ({ data: { products: { edges: [{ node: { title: 'A', handle: 'a', description: 'd' } }] } } }),
      };
    };
  });

  afterEach(() => {
    fetchCalls = [];
    delete global.fetch;
  });

  it('returns empty array when config missing', async () => {
    const results = await searchShopifyProducts('x', {});
    assert.strictEqual(fetchCalls.length, 0);
    assert.deepStrictEqual(results, []);
  });

  it('fetches products with admin token', async () => {
    const env = { SHOPIFY_STORE_DOMAIN: 'tataoro.com', SHOPIFY_API_TOKEN: 'k' };
    const results = await searchShopifyProducts('curl', env);
    assert.strictEqual(fetchCalls.length, 1);
    assert.deepStrictEqual(results, [
      { title: 'A', url: 'https://tataoro.com/products/a', description: 'd' },
    ]);
  });
});
