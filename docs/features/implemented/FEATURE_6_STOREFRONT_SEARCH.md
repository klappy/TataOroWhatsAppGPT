# 🔎 Feature: Shopify Storefront Product Search

## 🧭 Objective
Enable the assistant to fetch live product recommendations from the Tata Oro Shopify store based on keywords.

---

## 📬 API Details
- Endpoint: `https://{store}/api/2024-01/graphql.json`
- Uses the existing `SHOPIFY_API_TOKEN` secret

Example query:

```graphql
{
  products(first: 5, query: "hydration") {
    edges { node { title handle description } }
  }
}
```

---

## 🛠 Usage
Call `searchShopifyProducts(query, env)` and receive an array like:

```js
[
  { title: 'Flaxseed Shampoo', url: 'https://tataoro.com/products/flaxseed-shampoo', description: '...' }
]
```

- Can be invoked by GPT or other handlers to suggest products
- Returns `[]` on errors or missing config
