# ADR 004: Use Resend for Email Delivery

## Status

✅ Accepted

## Context

We needed a way to email summaries to Tata and possibly the client after a consultation — including Markdown, R2 image links, and a shareable WhatsApp handoff.

## Decision

We chose Resend over SendGrid and Mailgun because:

- Simple HTTPS API, ideal for Cloudflare Workers
- Free tier with enough headroom (3,000 emails/mo)
- Supports plain HTML + Markdown conversion
- Developer-first experience

## Consequences

- If Resend fails, we must log it and retry later
- We rely on domain verification and API key security
- Sending must always be wrapped in `try/catch`
