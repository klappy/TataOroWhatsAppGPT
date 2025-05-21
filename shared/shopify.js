/**
 * Upsert Shopify customer record on consultation milestones.
 * @param {object} options
 * @param {object} options.env - Worker environment with Shopify config
 * @param {string} options.firstName
 * @param {string} options.phone
 * @param {string} [options.email]
 * @param {string} [options.tags]
 * @param {string} [options.note]
 */
export async function upsertShopifyCustomer({ env, firstName, phone, email, tags, note }) {
  const storeDomain = env.SHOPIFY_STORE_DOMAIN;
  const token = env.SHOPIFY_API_TOKEN;
  if (!storeDomain || !token) {
    return;
  }
  const url = `https://${storeDomain}/admin/api/2023-04/customers.json`;
  const customer = { first_name: firstName, phone, email, tags, note };
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({ customer }),
    });
  } catch (err) {
    console.error('Shopify upsert error', err);
  }
}

/**
 * Search products using Shopify Storefront API.
 * @param {string} query - Search keywords (e.g. hydration, repair)
 * @param {object} env - Worker environment with Shopify config
 * @returns {Promise<Array<{title:string,url:string,description:string}>>}
 */
export async function searchShopifyProducts(query, env) {
  const storeDomain = env.SHOPIFY_STORE_DOMAIN;
  const token = env.SHOPIFY_API_TOKEN;
  if (!storeDomain || !token) {
    return [];
  }
  const url = `https://${storeDomain}/api/2024-01/graphql.json`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token,
    },
    body: JSON.stringify({
      query: `{
  products(first: 5, query: "${query}") {
    edges { node { title handle description } }
  }
}`,
    }),
  });
  if (!response.ok) {
    console.error('Shopify search error', await response.text());
    return [];
  }
  const data = await response.json();
  const edges = data?.data?.products?.edges || [];
  return edges.map(({ node }) => ({
    title: node.title,
    url: `https://${storeDomain}/products/${node.handle}`,
    description: node.description,
  }));
}