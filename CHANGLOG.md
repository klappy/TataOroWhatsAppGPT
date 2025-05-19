# Changelog

All notable changes to this project will be documented in this file.

## v1.3.2 - Bug Fix: history undefined after reset

- Safely handle missing session data after reset to prevent `ReferenceError: history is not defined`; update workers/whatsapp.js for defensive KV reads and docs/architecture/kv-state-machine.md to emphasize safe defaults.

## v1.3.1 - Architecture Documentation

- Added antifragile-integrations, async-flow, kv-state-machine, openai-routing docs.
- Added back manual "send email" / "email summary" command in async flow documentation to match supported features

## v1.3.0 - Implement planned consultation workflow enhancements

- Track and store session metadata (progress_status, last_active, summary_email_sent, nudge_sent, history, r2Urls) in KV
- Upsert Shopify customer record on milestones (photo upload, name collection, summary complete)
- Manual "send email" / "email summary" command to forward summary via email
- Scheduler worker (`workers/scheduler.js`) for timeout-based email summaries and WhatsApp nudges
- Configure wrangler.toml with scheduler, Shopify, and Twilio settings
- Update README.md and ARCHITECTURE.md with new features and environment variables

## v1.2.3 - Reset conversation via incoming keywords

- Detect reset triggers ("reset", "clear", "start over", "new consultation") and clear session history
- Update workers/whatsapp.js to handle reset without invoking GPT and send confirmation message
- Update documentation for reset conversation feature (README.md, ARCHITECTURE.md, VIBE_CHECK.md)

## v1.2.2 - Email chat summary, transcript, and images

- Add shared/emailer.js for Resend email integration
- Automatically send consultation summary, transcript, and image links after summary handoff link
- Configure wrangler.toml [vars] for EMAIL_ENABLED, EMAIL_PROVIDER, EMAIL_FROM, EMAIL_TO
- Update workers/whatsapp.js to trigger email upon summary generation
- Update documentation to include email feature (README.md, ARCHITECTURE.md)

## v1.2.1

Fixed system prompt to what it was suppose to be.

## v1.2.0

New system prompt: Tata Oro Curly Hair Consultation Assistant.

## v1.1.11

Move KV and R2 bindings to the top-level of your `wrangler.toml` file and update documentation accordingly.

## v1.1.10

Ensure all bindings in `wrangler.toml` use array-of-tables formatting and update documentation accordingly.

## v1.1.9

Refactor worker filenames: move /workers/{name}/index.js to /workers/{name}.js, update wrangler.toml and documentation references.

## v1.1.8

Add top-level default entry-point in wrangler.toml to support default Wrangler deploy without --env flag.

## v1.1.6

Fix missing entry-point error in Wrangler deploy by setting main path explicitly.

## v1.1.7

Extracted system prompt to shared module for maintainability

## [1.1.5] - 📦 Refactoring Tata Oro WhatsApp Assistant for Multi-Worker Setup

- Move WhatsApp code to `workers/whatsapp/index.js`
- Create `workers/doc-sync` and `workers/upload-hook` workers
- Add shared utilities in `shared` directory for GPT, embeddings, chunking, and prompt building
- Update `wrangler.toml` with multi-worker env configurations
- Update documentation: README.md, ARCHITECTURE.md, VIBE_CHECK.md

## [0.1.0] - Initial release

- Initial implementation of Cloudflare Worker webhook handler:
  - Accept Twilio WhatsApp messages (text & images)
  - Short-term memory in KV storage (`CHAT_HISTORY`)
  - System prompt & chat history injection for GPT-4
  - GPT-4 Vision support for image understanding
  - TwiML `<Response><Message>` reply formatting

## [0.1.1] - Switch to GPT-4o-mini

- Switch to GPT-4o-mini model for faster, cheaper, multimodal support
- Update code and documentation to reflect GPT-4o-mini usage

## [0.1.2] - Vision integration & checklist verification

- Upgrade GPT-4o-mini vision integration: send actual `image_url` messages to model in both live prompts and KV history.
- Update `VIBE_VERIFY.md` to correct GPT-4o-mini entries and check off verified items.

## [0.1.3] - Twilio TwiML compliance enhancements

- Added TwiML checks to `VIBE_VERIFY.md` based on Twilio Messaging TwiML docs:
  - Ensure XML declaration, `<Response><Message>` structure, XML escaping rules, HTTP 200 response, and proper Content-Type header.
  - Recommended verifying `X-Twilio-Signature` header for incoming requests.
- Implemented `escapeXml` in `index.js`, updated TwiML generation to include XML prolog and `text/xml; charset=UTF-8` header.

## [0.1.4] - GPT-4o-mini media detection & checklist updates

- Implement GPT-4o image message formatting in `index.js`: messages include content arrays with `image_url` objects and optional caption text entries.
- Check off new media detection items in `VIBE_VERIFY.md`.

## [0.1.5] - Twilio media R2 storage & static serving

- Download Twilio media using Basic Auth (`TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`)
- Upload media to R2 bucket (`MEDIA_BUCKET`) for public access
- Serve R2 media via GET `/images/<key>` route in Worker
- Pass R2 URLs to OpenAI GPT-4o-mini for image processing
