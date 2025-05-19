# ADR 003: Create Shopify Customers from Consultations

## Status

✅ Accepted

## Context

Clients often start consultations without completing them. Capturing them in Shopify enables later re-engagement and tracking via email flows and tags.

## Decision

We integrate Shopify’s Admin API to create/update a customer record when a user provides a name, phone, and/or email.

## Consequences

- Shopify API failures must be handled gracefully and retried
- We tag customers (`whatsapp`, `curl-lead`, etc.) and link to summaries
- This introduces a dependency on Shopify availability and auth tokens
