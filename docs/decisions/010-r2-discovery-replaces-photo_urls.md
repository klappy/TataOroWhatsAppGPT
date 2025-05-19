# ADR 010: Replace KV-tracked `photo_urls[]` with R2 Discovery

## Status

✅ Accepted

## Context

Tracking uploaded photo URLs in KV led to race conditions. Each image triggered a separate Worker call, often overwriting others.

## Decision

Rather than storing each image link in KV, we now:

- Use a predictable R2 path format: `whatsapp:+<phone>/...`
- List all objects with that prefix during summary generation
- Dynamically include all image URLs

## Consequences

- Race condition eliminated
- Full image history always retrievable
- Summary logic decoupled from mutation-heavy state
