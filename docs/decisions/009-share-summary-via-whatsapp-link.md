# ADR 009: Share Consultation Summaries via WhatsApp Link

## Status
✅ Accepted

## Context
After a consultation is completed, clients should be able to send their summary directly to Tata via WhatsApp using a pre-filled message.

## Decision
We construct a dynamic `wa.me` link that includes:
- Summary content (URL-encoded, no emojis)
- Direct links to R2-hosted photos

## Consequences
- Summaries must be plain-text encoded for URL safety
- All image links must be preserved and included inline
- Assistant should generate this message and hyperlink as the final output
