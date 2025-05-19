# ADR 012: Always Default Missing KV Session to Safe Structure

## Status

✅ Accepted

## Context

On first-time messages or after a reset, the KV entry `CHAT_HISTORY:<phone>` does not exist. This led to runtime errors.

## Decision

Session reads now always use a fallback-safe initializer:

```js
const session = (await KV.get(chatKey, { type: "json" })) || {};
const messages = Array.isArray(session.messages) ? session.messages : [];
```

Or use `getSafeSession()` to ensure defaults.

## Consequences

- First-time messages are treated as valid
- Reset flow is race-free
- No session read should assume KV exists
