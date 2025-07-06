# Changelog

All notable changes to this project will be documented in this file.

## v1.8.7 - Improved Initial Greeting & Readable Service Format (2025-07-06)

- **Warm introduction on first contact** - Bot now introduces itself and explains Tata's service before asking new/existing client status
- **Better readability** - Broke up long service information paragraphs into digestible chunks with emojis
- **Enhanced formatting** - More emojis throughout (💰 for pricing, ⏰ for time, service-specific emojis like ✂️ 🌈 💆‍♀️)
- **Improved UX flow** - From abrupt "Are you new or old?" to proper "Hi! I'm Tata's assistant..." introduction
- **Visual service listings** - Each service now has clear structure with pricing, duration, and description separated for easy scanning
- **CRITICAL FIX**: Existing clients now properly see the full service catalog instead of generic "browse Booksy yourself" message
- **Moved backup service data to top** - Ensures GPT uses detailed service information when function calling is disabled
- **Explicit existing client instructions** - Clear mandate to show complete service list with prices before booking link
- **Fixed false availability promises** - Bot no longer says "Let me check availability" when it can't actually check - now provides honest "I can't check live availability" with helpful service info instead

## v1.8.6 - Enhanced Appointment Scraping & Correct Search Instructions (2025-07-06)

- **Fixed search instructions** - Now correctly specifies "Search for service" box under Tata's name, not the main Booksy search
- **Enhanced Playwright scraping** - Extended wait time to 6+ seconds after clicking "book" for calendar loading
- **Preferred dates support** - Can now ask clients for preferred dates before scraping appointments
- **Improved time slot detection** - More comprehensive selectors and patterns for finding appointment times
- **Better debugging** - Added console logging to track scraping progress and failures
- **Enhanced function calling** - `get_available_appointments` now supports optional preferred dates parameter

## v1.8.5 - Revolutionary Appointment Time Scraping (2025-07-06)

- **NEW: Real appointment time scraping** - Can now show actual available appointment slots instead of just booking instructions
- **Enhanced Playwright automation** - Clicks through Booksy booking flow to extract available times
- **Fixed confusing search instructions** - No more Ctrl+F confusion with multiple search bars
- **Better booking guidance** - Clear "scroll to find service" instructions instead of unreliable search
- **New `/booksy/appointments` endpoint** - Returns actual available appointment times for any service
- **Future-ready function calling** - New `get_available_appointments` function for when function calling is re-enabled
- **Improved UX flow** - From "figure out booking yourself" to "here are the available times: Tuesday 2pm, Wednesday 10am..."

## v1.8.4 - Emergency Fix for Hanging Issue (2025-07-06)

- **Temporarily disabled function calling** to eliminate hanging responses
- **Added request-level timeout** protection with 20-second overall limit
- **Enhanced error handling** with automatic fallback to backup service data
- **Emergency fallback response** provides complete service list when function calls fail
- **Fixed hanging issue** - all responses now complete within 3-4 seconds
- **Note**: Function calling will be re-enabled once MCP performance is optimized

## v1.8.3 - Performance Fixes for Function Calling (2025-07-06)

- **Increased function call timeout** from 5s to 15s to accommodate Playwright scraping
- **Optimized Playwright scraper** - use domcontentloaded instead of networkidle for faster page loads
- **Improved caching strategy** - prefer stale cache over slow scraping to eliminate hanging
- **Extended cache TTL** to 2 hours to reduce scraping frequency
- **Background refresh** - update cache in background when using stale data
- **Fixed hanging issue** when existing clients request service list

## v1.8.2 - Smart Client Branching Flow (2025-07-06)

- **New vs existing client detection** - Ask "Are you a new client or have you seen Tata before?" for better flow routing
- **New clients** → Guided curl discovery consultation process (photos, hair history, goals)
- **Existing clients** → Direct access to service list and booking
- **Smart status detection** - Skip branching question when client status is clear from initial message
- **Better UX flow** - Personalized experience based on client relationship with Tata

## v1.8.1 - Improved Booking Experience (2025-07-06)

- **Direct service listing** - "I want to book a service" now immediately shows all available services instead of asking clarifying questions
- **Better UX for general requests** - Optimized system prompt to recognize when users want to see the full service catalog
- **Clear examples** - Added specific triggers for when to show complete service list vs. specific recommendations

## v1.8.0 - Dynamic Booksy MCP Server (2025-07-06)

- **Dynamic service scraping** - Real-time Playwright scraper replaces static hardcoded service data
- **GPT function calling** - Intelligent service requests with get_booksy_services, search_booksy_services, get_service_recommendations, get_booking_instructions
- **Robust fallback system** - Comprehensive backup service data when scraping fails
- **Removed 270+ lines** of hardcoded bypass logic - GPT now handles all service requests naturally
- **Enhanced booking experience** - Dynamic search instructions with "Ctrl+F" tips for each service
- **Smart caching** - 1-hour TTL with graceful degradation and error handling
- **Comprehensive testing** - All MCP endpoints verified with proper error handling

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
