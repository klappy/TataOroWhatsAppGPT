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

- Images are uploaded with the user’s phone number + timestamp as key
- Public links are used in summaries and WhatsApp deep links
- Photo URLs are dynamically discovered from R2 at summary time, instead of persisting in KV

## Consequences

- R2 offers cost-effective object storage and integrates directly with Workers
- We must ensure uploaded photos are not overwritten in race conditions
- Image uploads must be idempotent and fast
- Photo metadata is inferred via R2 listing; no need to persist photo URLs in KV

## Implementation Notes

- Uploaded images use key format: `whatsapp:{phone}/{timestamp}-{filename}.jpg`
- Stored as public objects to support easy sharing via summary/email/WhatsApp
- During summary generation, list all R2 objects matching the user's phone-prefix to gather photo URLs

### Deletion & Cleanup Strategy

When resetting or clearing a conversation, delete all uploaded images by listing and removing each object under the same phone prefix:

```js
const prefix = `whatsapp:${phone}/`;
const { objects } = await env.MEDIA_BUCKET.list({ prefix });
await Promise.all(objects.map((obj) => env.MEDIA_BUCKET.delete(obj.key)));
```

Alternatively, if storing full R2 keys in session metadata, use the helper:

```js
await deleteR2Objects(env, session.r2Keys);
```

## Benefits

- Supports multimodal GPT input
- Keeps photo state decoupled from chat session message stream
- Enables async handoff and full context for Tata
