# ADR 015: Dedicated Worker for Public Image Access

## Status

Accepted

## Context

Greedy routing patterns previously caused `/images/*` requests to be handled by other workers. This led to 405 errors and invalid image URLs when OpenAI tried to fetch uploaded photos.

## Reason

Prevent routing shadowing by greedy match-all routes and isolate risk domains.

## Decision

Introduce a separate `images` worker that serves R2-hosted objects via `GET /images/*`. It isolates image delivery from the WhatsApp and summary workers and prevents route shadowing.

## Alternatives Considered

- Serving images directly from `whatsapp-incoming.js`
- Generating signed R2 URLs
- Using an image proxy service

## Outcome

A consistent routing pattern where `/images/*` always maps to the `tataoro-images` worker. The architecture is simpler and image access is easier to test and observe.

## Date

2025-05-21

## Scope

All `wa.tataoro.com` workers
