# TataOroWhatsAppGPT

Cloudflare Worker webhook handler for Twilio WhatsApp messages, powered by OpenAI's GPT-4o-mini (including Vision support).

## Overview

This repository uses a multi-worker setup to separate concerns across different Cloudflare Workers:

- **WhatsApp handler** (`workers/whatsapp.js`): handles incoming Twilio WhatsApp messages and generates GPT-4o-mini responses.
- **Doc-sync worker** (`workers/doc-sync.js`): fetches GitHub markdown files, splits content, generates embeddings, and stores them in KV.
- **Upload-hook worker** (`workers/upload-hook.js`): GitHub webhook endpoint to trigger automatic document sync.
- **Shared utilities** (`shared/`): common modules for GPT, embeddings, chunking, and prompt building.

For detailed prompt configuration, see [VIBE_PROMPT.md](docs/issues/05-closed/VIBE_PROMPT.md).

## Features

- Accept incoming WhatsApp messages (text & images) from Twilio
- Short-term memory with KV storage (`CHAT_HISTORY`)
- Reset conversation via keywords ("reset", "clear", "start over", "new consultation")
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
- Scheduler worker (`workers/scheduler.js`) with hourly cron checks

## Setup

Ensure your `wrangler.toml` defines the default `main` entry point for the WhatsApp worker:

```toml
main = "workers/whatsapp.js"

[env.whatsapp]
main = "workers/whatsapp.js"
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

Use the `--env` flag with Wrangler to develop and deploy each worker independently:

```bash
# Local development
wrangler dev --env whatsapp
wrangler dev --env docsync
wrangler dev --env uploadhook
wrangler dev --env scheduler

# Deployment (Default: WhatsApp worker)
wrangler deploy
# Environment-specific deployments
wrangler deploy --env whatsapp
wrangler deploy --env docsync
wrangler deploy --env uploadhook
wrangler deploy --env scheduler
``` 

## Pre-commit

Install Wrangler (if needed) and run pre-commit hooks:

```bash
npm install -g wrangler
pre-commit run --all-files
``` 
## Testing

Run unit tests with Jest:

```bash
npm install
npm test
```


## Usage

- Configure your Twilio WhatsApp webhook to point to the `whatsapp` worker endpoint (e.g., `https://<your-domain>/`).
- Trigger document synchronization by POSTing to the `doc-sync` worker or via a scheduled cron/CLI.
- Point your GitHub webhook to the `upload-hook` worker to automate updates.