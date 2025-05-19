# ADR 007: Use Cloudflare R2 for Image Relay and Storage

## Status

✅ Accepted

## Context

Users upload hair photos via WhatsApp. These images need to:

- Be stored persistently
- Be accessible via URL for summaries and WhatsApp handoffs
- Not be re-uploaded or transient (for cost and speed reasons)

## Decision

We use Cloudflare R2 to store images uploaded via WhatsApp:

- URLs are preserved in the session object (`photo_urls[]`)
- Public links are used in the summary and WhatsApp deep link
- Images are uploaded with the user’s phone number + timestamp as key

## Consequences

- R2 offers cost-effective object storage and integrates directly with Workers
- We must ensure uploaded photos are not overwritten in race conditions
- Image uploads must be idempotent and fast
- No metadata service is used — everything must be tracked in KV

## Implementation Notes

- Uploaded images use key format: `whatsapp:{phone}/{timestamp}-{filename}.jpg`
- Stored as public objects to support easy sharing via summary/email/WhatsApp

## Benefits

- Supports multimodal GPT input
- Keeps photo state decoupled from chat session message stream
- Enables async handoff and full context for Tata
