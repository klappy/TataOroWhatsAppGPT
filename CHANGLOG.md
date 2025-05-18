# Changelog

All notable changes to this project will be documented in this file.

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
