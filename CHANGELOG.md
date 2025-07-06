# Changelog

All notable changes to this project will be documented in this file.

## v1.7.1 - Critical Booking Flow Fixes and Straight Hair Detection (2025-07-05)

### Critical Bug Fixes

- **Fixed Service Matching**: Expanded keyword detection for service-specific booking requests
  - Added "full curly hair experience", "curly experience", "full experience", "rizos" to Full Rizos matching
  - Enhanced "curly adventure", "first time", "regular client" keyword detection
  - Added more natural language variations for all services
- **Enhanced Booking Keywords**: Added missing keywords to trigger Booksy integration
  - "full rizos", "curly adventure", "curly experience", "full curly", "experience", "rizos", "adventure"
  - "scalp treatment", "spa service", "restructuring", "bridal"
- **Added Service Matching Debug Logs**: Console logging to track keyword matching for troubleshooting

### New Features

- **Straight Hair Detection**: Added system prompt guidance for straight hair clients
  - Bot now detects when clients have straight hair (no natural waves/curls)
  - Gently explains that Tata specializes in enhancing existing curls, not creating curls
  - Guides clients to consider if they have any natural texture that could be enhanced

### Technical Improvements

- Comprehensive keyword expansion for better natural language understanding
- Debug logging for service matching to improve troubleshooting
- Updated system prompt with important straight hair guidance

### Business Impact

- **Prevents Inappropriate Bookings**: Straight hair clients are properly guided about service limitations
- **Improved Service Discovery**: Better keyword matching means fewer missed booking opportunities
- **Enhanced User Experience**: More natural language understanding for service requests

## v1.7.0 - Guided Booking Flow with Transparent Pricing (2025-07-05)

### Major Enhancements

- **Guided Booking Flow**: Completely redesigned customer booking experience
  - Customers now see service categories and pricing first, then get specific booking links after service selection
  - Eliminated direct links to generic Booksy page in favor of guided service discovery
  - Smart service matching recognizes specific service names and provides targeted booking assistance

### Transparent Pricing Structure

- **Starting Price Disclaimers**: All services now clearly marked as "starting at" prices for short hair
- **Length/Density Warnings**: Automatic disclaimer that longer or denser hair may cost up to 2x more due to additional time required
- **Service-Specific Pricing Notes**: Each service includes detailed pricing guidance (e.g., "Starting at $150 for short hair. Longer/denser hair may cost up to $300")
- **Free Service Clarity**: Free consultation clearly marked as "Always free - no additional charges"

### Enhanced Service Discovery

- **Category-Based Responses**: Different responses for first-time clients, color services, cuts, and general inquiries
- **Keyword Detection**: Recognizes specific service names (consultation, curly cut, color, etc.) and provides targeted information
- **Personalized Recommendations**: Tailored suggestions with appropriate pricing disclaimers

### Comprehensive Booking Information

When customers request a specific service, they now receive:

- ✅ Detailed service information (duration, description, pricing notes)
- ✅ Step-by-step booking instructions with emojis for clarity
- ✅ Location and business information
- ✅ Preparation tips and next steps
- ✅ Personalized tips (different for consultation vs. paid services)

### Technical Improvements

- Updated `workers/booksy-mcp.js` with comprehensive pricing notes for all 14 services
- Enhanced `workers/whatsapp-incoming.js` with intelligent service matching and guided responses
- Improved booking link function with detailed instructions and disclaimers
- Updated feature documentation to reflect new guided booking flow

### Business Impact

- **Customer Transparency**: Eliminates pricing surprises by setting clear expectations upfront
- **Reduced Confusion**: Guided flow prevents customers from being overwhelmed by generic booking page
- **Professional Presentation**: Comprehensive service information builds trust and credibility
- **Better Qualified Leads**: Customers understand pricing structure before booking

## v1.6.0 - Booksy MCP Integration (2025-07-05)

### Added

- **Booksy MCP Integration**: Complete Model Context Protocol server for Tata Oro's Booksy booking system
  - Service discovery with prices and durations for all of Tata's curly hair services
  - Direct booking link generation with step-by-step client instructions
  - Service search functionality by keyword
  - Personalized service recommendations based on client type (first-time, regular, color-interested, treatment-focused)
  - Business information including location, specialties, and ratings
  - Comprehensive test suite with 17 passing tests
  - Feature documentation in `docs/features/implemented/FEATURE_8_BOOKSY_MCP_INTEGRATION.md`

### Technical Details

- New worker: `workers/booksy-mcp.js` - Full MCP server implementation
- Service catalog with 14 services across 5 categories (consultation, curly, color, treatment, special)
- Integration points designed for WhatsApp bot enhancement
- Error handling and input validation for all MCP tools
- Business ID: 155582, Staffer ID: 880999 for Tata Oro at Akro Beauty

### Integration Benefits

- 24/7 service discovery through WhatsApp
- Reduced manual coordination for booking inquiries
- Consistent pricing and service information
- Direct booking links with clear instructions
- Personalized recommendations for different client types

## v1.5.0 - Audio Clip Support Migrated to Whisper Transcription

- Migrated WhatsApp audio clip support to use OpenAI Whisper API for transcription.
- Audio clips are now transcribed to text before being sent to GPT-4o, replacing the previous base64 `input_audio` message format.
- Updated `workers/whatsapp-incoming.js` to handle Whisper transcription and new message structure.
- Updated test suite (`__tests__/whatsapp-audio.test.js`) to assert transcription-based flow and session history.
- Updated documentation (`docs/features/implemented/FEATURE_7_AUDIO_CLIP_SUPPORT.md`) to reflect the new architecture and flow.
- This is a breaking change for any consumers expecting the old audio message format.

## v1.1.0 - Audio Clip Support for WhatsApp Assistant

- Added support for audio clips as inputs in WhatsApp conversations 🎤
- Updated 'whatsapp-incoming.js' to process and store audio files in Cloudflare R2 with base64 encoding for OpenAI API
- Ensured audio format compatibility with OpenAI API by setting supported formats ('mp3' instead of 'ogg')
- Fixed audio processing to read data only once for both storage and API usage
- Modified system prompt to include audio messages or voice notes in consultation data
- Updated test file 'whatsapp-audio.test.js' to reflect correct handling of audio data

## v1.0.6 - Fix Audio Format Compatibility for OpenAI API

- Updated 'whatsapp-incoming.js' to ensure audio format is set to a supported value ('mp3' instead of 'ogg') for compatibility with the OpenAI API

## v1.0.5 - Fix Audio Processing Error

- Updated 'whatsapp-incoming.js' to read audio data only once, using it for both Cloudflare R2 storage and base64 conversion for OpenAI API, resolving the "Body has already been used" error

## v1.0.4 - Audio Clip Support with Base64 Data for OpenAI API

- Updated 'whatsapp-incoming.js' to include base64-encoded audio data in the 'input_audio' object as required by the OpenAI API
- Ensured audio media is processed and stored in Cloudflare R2 with the correct format
- Updated test file 'whatsapp-audio.test.js' to reflect the correct handling of audio data

## v1.0.3 - Audio Clip Support with Correct Content Type for OpenAI API

- Updated content type for audio inputs from 'audio_url' to 'input_audio' to match OpenAI API requirements
- Ensured audio media is processed and stored in Cloudflare R2 with the correct format
- Updated test descriptions to reflect the change in content type for consistency

## v1.0.2 - Audio Clip Support for WhatsApp Assistant

- Added support for audio clips as inputs in WhatsApp conversations 🎤
- Updated 'whatsapp-incoming.js' to process and store audio files in Cloudflare R2
- Modified system prompt to include audio messages or voice notes in consultation data

## v1.0.1 - System Prompt Enhancements and Documentation Updates

- Enhanced system prompt to ask clients about openness to curl cuts/trims ✂️
- Added appointment scheduling questions to gather preferred dates/times 📅
- Restructured async-flow.md documentation to describe issue resolution workflow
- Updated documentation to guide Codex CLI on handling development issues

## v1.4.9 - Shopify Storefront Search

- Added `searchShopifyProducts` helper for live product queries
- Documentation and tests updated

## v1.4.8 - Shared Summary Renderer

- Extracted `renderSummaryHTML` for consistent email and page layout
- Summary worker and emailer now reuse the same renderer
- Email tests updated for HTML output

## v1.4.7 - Summary Detection Fix

- Detect assistant-generated summary output and mark session `summary-ready`
- Persist summary in KV before replying

## v1.4.6 - Assistant-Led Summary Handoff

- Inject session summary and link into GPT context instead of overriding replies
- Removed regex-based summary detection
- Updated scheduler and email triggers to set `summary-ready` status
- Documentation updates for new flow

## v1.4.5 - Session Key Normalization

- Added `normalizePhoneNumber` helper and hardened `chatHistoryKey`.
- All WhatsApp session keys now use strict `whatsapp:+E164/history.json` format.
- Updated workers and tests accordingly.

## v1.4.4 - Router Worker

- Changed back /api/messages to /whatsapp/incoming
- Updated tests, docs and configuration to match

## v1.4.3 - Router Worker

- Consolidated all routes into a single router worker with modular handlers.
- Updated docs and configuration to remove multi-worker setup.

## v1.4.2 - Multi-channel route refactor

- Adopted `/whatsapp/incoming` route and new summary worker.
- Standardized storage keys using channel prefixes.

## v1.4.1 - Update Admin Route

- Admin dashboard now served under `https://wa.tataoro.com/admin` instead of the `admin.tataoro.com` subdomain.

## v1.4.0 - Admin Dashboard Worker

- Added `workers/admin.js` providing a lightweight web UI for listing sessions, viewing details, and resetting conversations.
- Updated `wrangler.toml` with `[env.admin]` configuration.
- Documented admin portal in README and ARCHITECTURE.

## v1.3.9 - Stateless Summary Endpoint for Long Conversations

- Serve a live, read-only HTML consultation summary via GET `/summary/:conversationId`, dynamically rendering chat messages, metadata, and inline images from KV and R2 without any separate storage or pre-generation.

## v1.3.8 - Fix R2 cleanup logic on reset

- Reset logic now always lists and deletes all R2 objects under the user prefix, ensuring no orphaned images remain.

## v1.3.6 - Cleanup R2 images on reset

- Deleting conversations now also removes any R2-hosted photos for that phone number
- Added r2 cleanup helper and tests

## v1.3.5 - Fix inline summary links

- When the assistant generates the final WhatsApp summary, replace the model's
  output with `generateOrFetchSummary` so photo URLs match the email summary.

## v1.3.4 - Bug Fix: summary photo links

- Ensure `shared/summary.js` always appends direct R2 image URLs to the
  consultation summary if the model omits them.

## v1.3.3 - Bug Fix: progress status never updated

- Update workers/whatsapp.js to set `progress_status` to `photo-received` or `midway`
  based on incoming messages so scheduler emails and nudges trigger correctly.

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

## v1.1.7

Extracted system prompt to shared module for maintainability

## v1.1.6

Fix missing entry-point error in Wrangler deploy by setting main path explicitly.

## [1.1.5] - 📦 Refactoring Tata Oro WhatsApp Assistant for Multi-Worker Setup

- Move WhatsApp code to `workers/whatsapp/index.js`
- Create `workers/doc-sync` and `workers/upload-hook` workers
- Add shared utilities in `shared` directory for GPT, embeddings, chunking, and prompt building
- Update `wrangler.toml` with multi-worker env configurations
- Update documentation: README.md, ARCHITECTURE.md, VIBE_CHECK.md

## [0.1.5] - Twilio media R2 storage & static serving

- Download Twilio media using Basic Auth (`TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`)
- Upload media to R2 bucket (`MEDIA_BUCKET`) for public access
- Serve R2 media via GET `/images/<key>` route in Worker
- Pass R2 URLs to OpenAI GPT-4o-mini for image processing

## [0.1.4] - GPT-4o-mini media detection & checklist updates

- Implement GPT-4o image message formatting in `index.js`: messages include content arrays with `image_url` objects and optional caption text entries.
- Check off new media detection items in `VIBE_VERIFY.md`.

## [0.1.3] - Twilio TwiML compliance enhancements

- Added TwiML checks to `VIBE_VERIFY.md` based on Twilio Messaging TwiML docs:
  - Ensure XML declaration, `<Response><Message>` structure, XML escaping rules, HTTP 200 response, and proper Content-Type header.
  - Recommended verifying `X-Twilio-Signature` header for incoming requests.
- Implemented `escapeXml` in `index.js`, updated TwiML generation to include XML prolog and `text/xml; charset=UTF-8` header.

## [0.1.2] - Vision integration & checklist verification

- Upgrade GPT-4o-mini vision integration: send actual `image_url` messages to model in both live prompts and KV history.
- Update `VIBE_VERIFY.md` to correct GPT-4o-mini entries and check off verified items.

## [0.1.1] - Switch to GPT-4o-mini

- Switch to GPT-4o-mini model for faster, cheaper, multimodal support
- Update code and documentation to reflect GPT-4o-mini usage

## [0.1.0] - Initial release

- Initial implementation of Cloudflare Worker webhook handler:
  - Accept Twilio WhatsApp messages (text & images)
  - Short-term memory in KV storage (`CHAT_HISTORY`)
  - System prompt & chat history injection for GPT-4
  - GPT-4 Vision support for image understanding
  - TwiML `<Response><Message>` reply formatting
