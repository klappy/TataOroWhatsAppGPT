# ADR 013: Use Status Flags Instead of Booleans in KV

## Status

✅ Accepted

## Context

Tracking flags like `email_sent = true` is too brittle for retries, backfills, and failed delivery handling.

## Decision

We replaced binary flags with enumerated `*_status` fields:

- `email_status = "pending" | "sent" | "failed"`
- `shopify_status = "sent" | "failed" | "pending"`
- `nudge_status = "skipped" | "sent"`

## Consequences

- Easier to track and reprocess
- Works better with cron-triggered retry logic
- Avoids misinterpreting partial progress
