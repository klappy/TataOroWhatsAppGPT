# ADR 005: Use Twilio for WhatsApp Integration

## Status

✅ Accepted

## Context

Tata Oro’s assistant relies on WhatsApp as the primary communication channel. We need a reliable API to:

- Receive user messages
- Send assistant replies
- Send follow-up nudges
- Maintain state via phone number as unique identifier

## Decision

We chose Twilio’s Programmable Messaging API for WhatsApp integration because:

- Widely supported and well-documented
- Supports inbound message webhooks (for Cloudflare Workers)
- Supports outbound replies, media uploads, and interactive messages
- Phone number acts as a stable session key

## Consequences

- Outbound messaging is rate-limited and must be gracefully retried
- We must track nudges to avoid duplicates (`nudge_status`)
- Twilio errors must be caught and logged without disrupting the user experience
- Integration requires storing and verifying Twilio auth credentials

## Implementation Notes

- Incoming messages trigger a POST to `/workers/whatsapp`
- We use `message.Body` and `From` to determine user intent and session
- Outgoing nudges or handoff links are sent with `fetch` to Twilio's API

## Benefits

- Enables bi-directional chat with GPT assistant
- Works for both conversational messages and follow-up automation
- Supports long-term session continuity via phone number
