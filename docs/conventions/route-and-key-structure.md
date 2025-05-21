# Route and Key Structure

This project organizes all endpoints by channel first, then service. Incoming message webhooks live under `/[channel]/incoming`.

Examples:

- `/whatsapp/incoming`
- `/webchat/incoming`

Public utilities like summaries remain platform agnostic:

- `/summary/:conversationId`

Storage keys follow a `datastore/namespace/platform:identifier/...` pattern to enable prefix queries across multiple channels.

Examples:

- `kv/chat/whatsapp:+14155551234/history`
- `kv/docs/github:klappy/docs/file.md/chunk3`
- `r2/media/whatsapp:+14155551234/1700000000000-0.jpeg`
