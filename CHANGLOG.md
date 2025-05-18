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