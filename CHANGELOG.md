# Changelog

All notable changes to this project will be documented in this file.

## v1.7.2 - Changelog Consolidation (2025-07-05)

- **Consolidated changelog** - removed verbose descriptions, kept essential information
- **High-level overview** format with just enough detail to understand changes
- **Improved readability** for quick scanning of version history

## v1.7.1 - Booking Flow & Straight Hair Detection (2025-07-05)

- **Fixed service matching** with expanded keywords for natural language booking requests
- **Added straight hair detection** - guides clients about Tata's specialization in enhancing existing curls
- **Enhanced booking keywords** for better Booksy integration triggering
- **Added debug logging** for service matching troubleshooting

## v1.7.0 - Guided Booking Flow with Transparent Pricing (2025-07-05)

- **Redesigned booking experience** - customers see services/pricing first, then get specific booking links
- **Added transparent pricing** - all services marked as "starting at" with length/density disclaimers
- **Enhanced service discovery** with category-based responses and keyword detection
- **Comprehensive booking info** with step-by-step instructions, location, and preparation tips

## v1.6.0 - Booksy MCP Integration (2025-07-05)

- **Complete Booksy integration** - MCP server for service discovery, booking links, and recommendations
- **14 services across 5 categories** with prices, durations, and descriptions
- **WhatsApp bot enhancement** ready with business info and personalized recommendations
- **Full test suite** with 17 passing tests and comprehensive documentation

## v1.5.0 - Audio Clip Support via Whisper (2025-07-05)

- **Migrated to Whisper transcription** - audio clips now transcribed to text before GPT processing
- **Breaking change** from previous base64 audio format to transcription-based flow
- **Updated tests and docs** to reflect new audio architecture

## v1.4.9 - Shopify Storefront Search

- Added live product search functionality with `searchShopifyProducts` helper

## v1.4.3 - Router Worker Architecture

- **Consolidated routing** - single router worker with modular handlers replacing multi-worker setup
- **Standardized routes** - `/whatsapp/incoming` and organized endpoint structure

## v1.4.0 - Admin Dashboard

- **Web-based admin portal** at `/admin` for session management, conversation viewing, and resets
- **Lightweight UI** for monitoring and managing WhatsApp conversations

## v1.3.9 - Live Summary Endpoint

- **Shareable summaries** via GET `/summary/:conversationId` with live rendering from KV/R2
- **No pre-generation** - dynamically builds HTML with chat messages and inline images

## v1.3.0 - Consultation Workflow

- **Session metadata tracking** - progress status, timestamps, email/nudge flags
- **Shopify customer sync** on milestones (photo upload, name collection, summary)
- **Scheduler worker** for timeout-based emails and WhatsApp nudges
- **Manual email command** - "send email" trigger for consultation summaries

## v1.2.3 - Reset Conversations

- **Keyword-based reset** - "reset", "clear", "start over" clears session history
- **Confirmation messaging** without GPT invocation for faster response

## v1.2.2 - Email Integration

- **Automated email summaries** via Resend after consultation completion
- **Full transcript and images** included in consultation summary emails

## v1.2.0 - Enhanced System Prompt

- **Tata Oro specialization** - curly hair consultation assistant with appointment scheduling

## v1.1.5 - Multi-Worker Refactor

- **Modular architecture** - separate workers for WhatsApp, doc-sync, upload-hook
- **Shared utilities** for GPT, embeddings, chunking, and prompt building

## v0.1.5 - Media Storage & Serving

- **R2 integration** - download Twilio media, store in R2, serve via `/images/<key>`
- **GPT-4o Vision** - pass R2 URLs to OpenAI for image processing

## v0.1.0 - Initial Release

- **Cloudflare Worker** webhook handler for Twilio WhatsApp
- **GPT-4o-mini** with vision support for text and image understanding
- **KV storage** for chat history and session state
- **TwiML responses** for WhatsApp message replies
