# TataOroWhatsAppGPT

Cloudflare Worker webhook handler for Twilio WhatsApp messages, powered by OpenAI's GPT-4o-mini (including Vision support).

## Overview

This repository uses a multi-worker setup to separate concerns across different Cloudflare Workers:

- **WhatsApp handler** (`workers/whatsapp.js`): handles incoming Twilio WhatsApp messages and generates GPT-4o-mini responses.
- **Doc-sync worker** (`workers/doc-sync.js`): fetches GitHub markdown files, splits content, generates embeddings, and stores them in KV.
- **Upload-hook worker** (`workers/upload-hook.js`): GitHub webhook endpoint to trigger automatic document sync.
- **Shared utilities** (`shared/`): common modules for GPT, embeddings, chunking, and prompt building.

For detailed prompt configuration, see [VIBE_PROMPT.md](vibe/plans/success/VIBE_PROMPT.md).

## Features

- Accept incoming WhatsApp messages (text & images) from Twilio
- Short-term memory with KV storage (`CHAT_HISTORY`)
- System prompt & chat history injection for GPT-4o-mini
- GPT-4o-mini vision support for understanding images
- Generates TwiML responses for Twilio webhook
- Basic logging and CORS handling

## Setup

Ensure your `wrangler.toml` defines the default `main` entry point for the WhatsApp worker:

```toml
main = "workers/whatsapp.js"

[env.whatsapp]
main = "workers/whatsapp.js"
```

Configure your `wrangler.toml` with KV namespaces and R2 bucket bindings:

```toml
[[kv_namespaces]]
binding = "CHAT_HISTORY"
id = "<your-chat-history-kv-id>"

[env.docsync.kv_namespaces]
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
```

## Development & Deployment

Use the `--env` flag with Wrangler to develop and deploy each worker independently:

```bash
# Local development
wrangler dev --env whatsapp
wrangler dev --env docsync
wrangler dev --env uploadhook

# Deployment (Default: WhatsApp worker)
wrangler deploy
# Environment-specific deployments
wrangler deploy --env whatsapp
wrangler deploy --env docsync
wrangler deploy --env uploadhook
```

## Pre-commit

Install Wrangler (if needed) and run pre-commit hooks:

```bash
npm install -g wrangler
pre-commit run --all-files
``` 

## Usage

- Configure your Twilio WhatsApp webhook to point to the `whatsapp` worker endpoint (e.g., `https://<your-domain>/`).
- Trigger document synchronization by POSTing to the `doc-sync` worker or via a scheduled cron/CLI.
- Point your GitHub webhook to the `upload-hook` worker to automate updates.