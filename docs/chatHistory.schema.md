# 📑 CHAT_HISTORY Session Schema

## Overview
This document captures the real structure of the `CHAT_HISTORY` value stored in the KV namespace. The fields below are inferred from the current implementation and reflect what the Workers actually read and write.

## TypeScript Style Interface
```ts
interface ChatHistorySession {
  history: ChatMessage[];               // conversation transcript
  progress_status: 'started' | 'photo-received' | 'midway' | 'summary-ready';
  summary_email_sent: boolean;          // true once an email summary is sent
  nudge_sent: boolean;                  // true once a follow‑up WhatsApp nudge is sent
  r2Urls: string[];                     // public URLs for uploaded media
  summary?: string;                     // assistant generated summary
  last_active: number;                  // epoch seconds for timeout logic
  // additional keys persisted from previous versions are kept as-is
  [key: string]: any;
}
```

## Field Notes
- **history** – Array of chat messages as passed to GPT and rendered in `/summary/*`. Messages may be plain strings or arrays containing `text` and `image_url` entries.
- **progress_status** – Updated in `handleWhatsAppRequest` when the user sends text or photos and when a summary is detected. Scheduler logic relies on this value to trigger emails and nudges.
- **summary_email_sent** – Set to `true` after an email is successfully dispatched from either the manual command or the scheduler.
- **nudge_sent** – Marks that a WhatsApp reminder has been sent to avoid duplicates.
- **r2Urls** – Tracks R2 image URLs that were uploaded during the conversation. The worker appends new entries for each media upload.
- **summary** – Cached assistant summary. Presence of this field indicates the session has reached the `summary-ready` stage.
- **last_active** – Updated on every incoming message for timeout calculations.
- **Other keys** – Any unknown properties found in KV are preserved when reading and writing the object.

## Lifecycle
1. **Load & Default** – The WhatsApp worker reads the stored JSON and populates defaults if fields are missing.
2. **Mutation** – Incoming messages append to `history`, media URLs are collected in `r2Urls`, and `last_active` is refreshed.
3. **Email Trigger** – When the user sends `"send email"` or the scheduler detects inactivity, `generateOrFetchSummary` builds the summary and `sendConsultationEmail` dispatches it, setting `summary_email_sent` and `progress_status` accordingly.
4. **Summary Detection** – If GPT replies with a message starting with `"Client Curl Discovery Summary for Tata Oro"`, that reply becomes the `summary` and the session is marked `summary-ready`.
5. **Storage** – After each update, the object is persisted back to KV with a TTL of one month (30 days).

## Example (Summary Ready)
```json
{
  "history": [
    { "role": "user", "content": "Hi there" },
    { "role": "assistant", "content": "Hello!" }
  ],
  "progress_status": "summary-ready",
  "summary_email_sent": true,
  "nudge_sent": true,
  "r2Urls": [
    "https://wa.tataoro.com/images/whatsapp:+1234567890/1716120000000-0.jpeg"
  ],
  "summary": "Client Curl Discovery Summary for Tata Oro\n...",
  "last_active": 1716155900
}
```

## Source References
- Session defaults and mutation logic – [`workers/whatsapp-incoming.js`](../workers/whatsapp-incoming.js) lines 96‑112 and 114‑124.
- Email command handling – [`workers/whatsapp-incoming.js`](../workers/whatsapp-incoming.js) lines 139‑166.
- Summary detection and storage – [`workers/whatsapp-incoming.js`](../workers/whatsapp-incoming.js) lines 200‑223.
- Scheduled email and nudge updates – [`workers/scheduler.js`](../workers/scheduler.js) lines 27‑69.
- Summary generation helper – [`shared/summary.js`](../shared/summary.js) lines 1‑51.
- Email dispatch helper – [`shared/emailer.js`](../shared/emailer.js) lines 1‑78.

> Schema compiled from direct observation of the codebase; examples are illustrative only.
