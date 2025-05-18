# Changelog

All notable changes to this project will be documented in this file.

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
