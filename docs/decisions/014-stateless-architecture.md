# ADR 010: Adopt Stateless Infrastructure as a Core Architectural Principle

## Status

Accepted

## Context

The Tata Oro WhatsApp Consultation Assistant is built on top of Cloudflare Workers, OpenAI's GPT-4o-mini, Twilio's WhatsApp API, and Cloudflare KV + R2. Given the nature of this architecture:

- Workers are stateless by default
- Storage is externalized via KV and R2
- The platform is message-driven, latency-sensitive, and cost-sensitive

Early design iterations explored patterns like persistent summary generation, pre-rendered payloads, and background workflows. These solutions added complexity, increased coupling, and introduced more points of failure.

As the project matured, a clear pattern emerged: **stateless, dynamic access to live state** (KV + R2) yields better results in reliability, speed, debugging ease, and operational simplicity.

## Decision

We formally adopt **Stateless Infrastructure** as a core principle for Tata Oro’s WhatsApp Assistant architecture.

All features should prefer stateless, on-demand resolution of data using the existing persistent stores (KV, R2), avoiding long-lived caches, derived writes, or background rendering where possible.

### Principles:

- 🔁 **No duplicate state**: Derive views and summaries from raw data at render time.
- 🚫 **No pre-generation**: Avoid workflows that require batch jobs or stored snapshots.
- 📭 **Pull, not push**: Serve content on request instead of pushing it into external state.
- 🪶 **Minimalism over layering**: Minimize new abstractions and systems unless there's clear fragility in the current model.
- 🧠 **Debuggable by default**: Design systems so that failures can be observed and replayed using only current KV and R2 state.

## Consequences

### Benefits

- ✅ Simpler architecture
- ✅ Fewer sync bugs and race conditions
- ✅ Clearer developer mental model
- ✅ Lower operational maintenance
- ✅ Easier debugging and local emulation

### Tradeoffs

- ❗️Live views reflect only current state; historical data must be retained explicitly if needed.
- ❗️Rendering logic must be resilient to partial or malformed state.
- ❗️All persistent state must be intentionally designed for long-term access (e.g., R2 object keys, KV schema).

## Examples of Application

- `/summary/:conversationId` page dynamically renders consultation summaries using live KV and R2 data, with no pre-generated storage or worker jobs.
- Image uploads are stored in R2 using namespaced prefixes (e.g. `whatsapp:+{phoneNumber}/`), retrievable on demand.
- Conversation reset deletes relevant keys directly from KV and R2, rather than manipulating derived states or caches.
- Messages are composed dynamically using current session data, not pre-assembled blocks.

## Related Alternatives Considered

- **Pre-generated summaries**: Added complexity, hard to debug, risk of stale data.
- **Full database backends**: Not aligned with Cloudflare’s edge-native stateless model.
- **Microservice split**: Overhead unjustified for current traffic and latency requirements.

## Related Documents

- `ARCHITECTURE.md`
- [ADR 009: Share Consultation Summaries via WhatsApp Link](./009-share-summary-via-whatsapp-link.md)
- [Issue: Stateless Summary Endpoint](https://github.com/klappy/TataOroWhatsAppGPT/issues/XYZ)
- [`VIBE_FEATURE_R2.md`](../architecture/r2-for-image-relay.md)
