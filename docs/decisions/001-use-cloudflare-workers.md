# ADR 001: Use Cloudflare Workers for Backend Execution

## Status

✅ Accepted

## Context

We needed a low-latency, low-maintenance backend for handling WhatsApp messages, image uploads, and AI integrations without provisioning infrastructure.

## Decision

We chose Cloudflare Workers because:

- Extremely fast cold start time
- Seamless KV and R2 integration
- Works well with stateless message flows
- Native support for fetch, storage, and API logic

## Consequences

- Worker limits on CPU time and memory require lightweight design
- WebSockets not supported (not needed)
- Development flows rely on Wrangler CLI
