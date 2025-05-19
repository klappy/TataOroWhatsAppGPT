# ADR 002: Use OpenAI for GPT-Powered Curl Consultation

## Status

✅ Accepted

## Context

We need a warm, conversational assistant capable of analyzing images and summarizing client input into structured consultation notes.

## Decision

We chose OpenAI (GPT-4o-mini) because:

- Multimodal capabilities support photo + text inputs
- High-quality language output for warm, professional tone
- Available in Cloudflare-compatible HTTP API format

## Consequences

- We need to manage token limits and system prompt design carefully
- External dependency requires fallback logic on failure
- Versioning prompts and tracking performance is essential
