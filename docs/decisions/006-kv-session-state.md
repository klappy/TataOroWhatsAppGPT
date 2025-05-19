# ADR 006: Use Cloudflare KV for Session State

## Status

✅ Accepted

## Context

The assistant needs to track each user’s consultation progress over multiple WhatsApp messages, including uploaded images and GPT exchanges.

## Decision

We store each session in KV using:

- Key: `CHAT_HISTORY:<phone>`
- Value: JSON object with messages, photos, flags, progress, timestamps

## Consequences

- KV is fast and globally distributed, but eventually consistent
- We must avoid race conditions (e.g. with photo uploads)
- All reads must assume data may be missing or partial
