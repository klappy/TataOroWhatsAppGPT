# TataOroWhatsAppGPT

Cloudflare Worker webhook handler for Twilio WhatsApp messages, powered by OpenAI's GPT-4o-mini (including Vision support).

## Overview

This Worker receives incoming WhatsApp messages via Twilio, maintains short-term chat memory in Cloudflare KV, forwards the conversation (and any images) to GPT-4o-mini, and returns a TwiML `<Response><Message>` reply.

For detailed prompt configuration, see [VIBE_PROMPT.md](VIBE_PROMPT.md).

## Features

- Accept incoming WhatsApp messages (text & images) from Twilio
- Short-term memory with KV storage (`CHAT_HISTORY`)
- System prompt & chat history injection for GPT-4o-mini
- GPT-4o-mini vision support for understanding images
- Generates TwiML responses for Twilio webhook
- Basic logging and CORS handling

## Setup

1. **Bind KV Namespace**

   In your `wrangler.toml`, add a KV namespace binding for `CHAT_HISTORY`:

   ```toml
   [[kv_namespaces]]
   binding = "CHAT_HISTORY"
   id = "<your-kv-namespace-id>"
   ```

2. **Set environment variables**

   ```bash
   export OPENAI_API_KEY="<your-openai-api-key>"
   export TWILIO_ACCOUNT_SID="<your-twilio-account-sid>"
   export TWILIO_AUTH_TOKEN="<your-twilio-auth-token>"
   ```

3. **Bind R2 Bucket**

   In your `wrangler.toml`, add an R2 bucket binding for `MEDIA_BUCKET`:

   ```toml
   [[r2_buckets]]
   binding = "MEDIA_BUCKET"
   bucket_name = "<your-r2-bucket-name>"
   preview_bucket_name = "<your-r2-bucket-name>"
   ```

4. **Deploy**

   ```bash
   wrangler publish
   ```

## Development

Install Wrangler (if needed) and run pre-commit hooks:

```bash
npm install -g wrangler
pre-commit run --all-files
``` 

## Usage

Configure your Twilio webhook to point to your Worker’s public URL.