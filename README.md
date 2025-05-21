# TataOroWhatsAppGPT

Cloudflare Worker webhook handler for Twilio WhatsApp messages, powered by OpenAI's GPT-4o-mini (including Vision support).

## Overview

This repository now exposes a **single Cloudflare Worker** with a modular router
(`workers/router.js`). It dispatches incoming requests to pure handler functions:

- `handleWhatsAppRequest` – `/whatsapp/incoming` webhook for Twilio
- `handleImagesRequest` – serves `/images/*` from R2
- `handleAdminRequest` – lightweight dashboard at `/admin`
- `handleSummaryRequest` – read-only summaries under `/summary/*`
- `handleUploadHookRequest` – GitHub webhook `/uploadhook`
- `handleDocSyncRequest` – manual ingestion at `/internal/doc-sync`
- Shared utilities live under `shared/` for GPT, embeddings, chunking and more.

For detailed prompt configuration, see [VIBE_PROMPT.md](docs/issues/05-closed/VIBE_PROMPT.md).

## Features

- Accept incoming WhatsApp messages (text & images) from Twilio
- Short-term memory with KV storage (`CHAT_HISTORY`)
- KV keys use a concise format like `whatsapp:+14155551234/history.json`
- Phone numbers are normalized (strip `whatsapp:` prefix, enforce `+` E.164)
- User phone numbers are inserted into the system prompt at runtime for
  personalized summary and WhatsApp handoff links
- Reset conversation via keywords ("reset", "clear", "start over", "new consultation") which also removes any uploaded photos from R2
- System prompt & chat history injection for GPT-4o-mini
- GPT-4o-mini vision support for understanding images
- Generates TwiML responses for Twilio webhook
- Basic logging and CORS handling
- Email consultation summary, transcript, and image links to configured recipients via Resend
- Track consultation progress status (photo received, midway, summary ready, complete)
- Automatically upsert Shopify customer on key milestones (photo, name, summary)
- Manual "send email" command to forward summary to Tata via email
- Scheduled timeout-based email summary for incomplete consultations
- Scheduled WhatsApp nudges for stalled consultations
- Automatically detects when GPT sends the final summary and marks the session as `summary-ready`
- Stateless GET `/summary/:conversationId` endpoint for dynamic, read-only HTML consultation summaries (chat messages, metadata, images) without separate storage.
- Dedicated `/images/*` route serves public R2-hosted media
- Scheduler worker (`workers/scheduler.js`) with hourly cron checks
- Lightweight admin portal (`workers/admin.js`) to browse sessions and reset them (available at `/admin` under the WhatsApp domain)

### Public Media Delivery

Images uploaded via WhatsApp are stored in R2. The `images` route exposes them at
`https://wa.tataoro.com/images/{encodedKey}`. Example:

```js
const url = `${WHATSAPP_BASE_URL}/images/${encodeURIComponent(key)}`;
```

## Setup

Ensure your `wrangler.toml` points to the router Worker:

```toml
main = "workers/router.js"
route = "https://wa.tataoro.com/*"
```

Configure your `wrangler.toml` with top-level KV namespaces and R2 bucket bindings:

```toml
[[kv_namespaces]]
binding = "CHAT_HISTORY"
id = "<your-chat-history-kv-id>"

[[kv_namespaces]]
binding = "DOC_KNOWLEDGE"
id = "<your-doc-knowledge-kv-id>"

[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "<your-r2-bucket-name>"
preview_bucket_name = "<your-r2-bucket-name>"
```

Set required environment variables:

```bash
export OPENAI_API_KEY="<your-openai-api-key>"
export TWILIO_ACCOUNT_SID="<your-twilio-account-sid>"
export TWILIO_AUTH_TOKEN="<your-twilio-auth-token>"

# Email settings
export EMAIL_ENABLED=true
export EMAIL_PROVIDER="resend"
export EMAIL_FROM="consultations@tataoro.com"
export EMAIL_TO="tata@tataoro.com"
export RESEND_API_KEY="<your-resend-api-key>"

# Shopify settings
export SHOPIFY_STORE_DOMAIN="<your-shopify-store-domain>"
export SHOPIFY_API_TOKEN="<your-shopify-api-token>"

# Twilio WhatsApp number for sending nudges
export TWILIO_WHATSAPP_NUMBER="whatsapp:<your-twilio-whatsapp-number>"
```

## Development & Deployment

Develop and deploy the router with standard Wrangler commands:

```bash
# Local development
wrangler dev

# Deployment
wrangler deploy
```

## Pre-commit

Install Wrangler (if needed) and run pre-commit hooks:

```bash
npm install -g wrangler
pre-commit run --all-files
```

## Testing

Run unit tests with Node's built-in test runner:

```bash
npm test
```

## Usage

- Configure your Twilio WhatsApp webhook to point to `/whatsapp/incoming` (e.g., `https://<your-domain>/whatsapp/incoming`).
- Trigger document synchronization by POSTing to `/internal/doc-sync` or via a scheduled cron/CLI.
- Point your GitHub webhook to `/uploadhook` to automate updates.
