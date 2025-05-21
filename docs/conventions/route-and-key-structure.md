# Route and Key Structure

This project organizes all endpoints by channel first, then service. Incoming message webhooks live under `/[channel]/incoming`.

Examples:

- `/whatsapp/incoming`
- `/webchat/incoming`

Public utilities like summaries remain platform agnostic:

- `/summary/:conversationId`

Storage keys are scoped by channel and identifier, without extra prefixes.

Examples:

- `whatsapp:+14155551234/history.json`
- `kv/docs/github:klappy/docs/file.md/chunk3`
- `whatsapp:+14155551234/1700000000000-0.jpeg`
