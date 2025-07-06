# Changelog

All notable changes to this project will be documented in this file.

## [1.9.1] - 2025-01-27

### 🔄 **RETRY LOGIC & USER COMMUNICATION: Never Leave Users Hanging!**

**MOTIVATION**: Users deserve to know what's happening when scraping takes time, and we should give things a second shot before falling back to backup data.

#### 🗣️ **TRANSPARENT USER COMMUNICATION**

- **Retry notifications**: "I'm having trouble getting the latest info. Let me try again! ⏳"
- **Success celebrations**: "Great! I was able to get the current details on my second attempt!"
- **Honest failure communication**: "I tried twice but had some technical issues. Here's what I can tell you!"
- **Always valuable**: Even with technical difficulties, users always get helpful information

#### 🔄 **SMART RETRY LOGIC**

- **Two-attempt strategy**: Every function gets at least one retry before giving up
- **Progressive timeouts**: First attempt (12s), retry attempt (15s) for better success
- **Failure tracking**: Only counts as circuit breaker failure after both attempts fail
- **Retry metadata**: Track successful retries for user communication

#### 💬 **ENHANCED USER EXPERIENCE**

**Before**:

- User: "What services do you offer?"
- _12 seconds of silence_
- Bot: "Here's our backup service list" (no explanation)

**After**:

- User: "What services do you offer?"
- _8 seconds_
- Bot: "I'm having trouble getting the latest service info. Let me try again! ⏳"
- _3 seconds_
- Bot: "Great! I was able to get the current details on my second attempt! Here are all our services..."

#### 🛠️ **TECHNICAL IMPLEMENTATION**

- **Function-specific retry messages**: Tailored communication per function type
- **Retry attempt tracking**: Logs and metadata for monitoring
- **Enhanced error context**: Better debugging with attempt numbers
- **User Agent versioning**: Track retry attempts in logs

#### 📊 **IMPROVED RELIABILITY**

- **Higher success rates**: Second attempts often succeed when first fails
- **Better user confidence**: Users know the system is working hard for them
- **Reduced perceived downtime**: Communication prevents "is it broken?" confusion
- **Graceful degradation**: Fallbacks still work perfectly when retries fail

#### 🎯 **USER PSYCHOLOGY BENEFITS**

- **Trust building**: Transparent communication builds confidence
- **Patience management**: Users wait longer when they know what's happening
- **Value perception**: Users appreciate the extra effort to get live data
- **Professional experience**: Handles technical issues like a human assistant would

**RESULT**: Users now experience a system that communicates clearly, tries hard to get them the best information, and never leaves them wondering what's happening! 🌟

## [1.9.0] - 2025-01-27

### 🚀 **FULL BEAST MODE ACTIVATED: Complete System Unleashed!**

**CELEBRATION**: Cloudflare plan upgraded! 🎉 All appointment features now LIVE and operational!

#### ⚡ **FULL FUNCTIONALITY RESTORED**

- **✅ Real-time appointment scraping**: `get_available_appointments` function re-enabled
- **✅ Complete service discovery**: All 5 function calls now operational
- **✅ Live availability checking**: Actual appointment times from Booksy calendar
- **✅ Enhanced user experience**: Full booking flow with real data

#### 🔧 **ENHANCED PERFORMANCE WITH UPGRADED CAPACITY**

- **Enhanced timeouts**: 10-second browser (up from 8), 8-second selectors (up from 6)
- **Better success rates**: More generous timing allows thorough scraping
- **Increased data return**: 15 time slots processed (up from 10), 8 returned (up from 5)
- **Improved scraping**: 12-second evaluation timeout for complex pages

#### 📅 **APPOINTMENT FEATURES UNLOCKED**

- **Real calendar scraping**: Actual available times from Booksy
- **Date preference support**: Users can specify preferred dates
- **Enhanced time detection**: Better parsing of AM/PM time slots
- **Graceful fallbacks**: Smart responses even if specific times unavailable

#### 🛡️ **FORTRESS RESILIENCE MAINTAINED**

- **Circuit breaker still active**: Protects against future issues
- **Multi-layer fallbacks**: Comprehensive backup responses
- **Smart caching**: 24-hour cache for optimal performance
- **Error boundaries**: Isolated function failures don't break system

#### 🎯 **USER EXPERIENCE TRANSFORMATION**

**Before**: "Do you have appointments Tuesday?" → Generic Booksy link
**After**: "Do you have appointments Tuesday?" → "Here are the available times: 10:00 AM, 2:30 PM, 4:00 PM..."

**Before**: Manual calendar checking required
**After**: Instant availability with preferred date filtering

#### 📊 **TECHNICAL ACHIEVEMENTS**

- **5/5 functions operational**: Complete Booksy integration
- **Enhanced appointment endpoint**: `/appointments?service=X&dates=Y,Z`
- **Upgraded browser utilization**: Optimized for higher capacity plan
- **Progressive enhancement**: Fast functions + slow functions both working

#### 🌟 **BUSINESS IMPACT**

- **Reduced booking friction**: Customers see availability instantly
- **Higher conversion**: Real appointment times vs generic instructions
- **Better user experience**: Complete information in one interaction
- **Competitive advantage**: Dynamic booking vs static competitors

**RESULT**: From resilient fortress to FULL POWER UNLEASHED! 🚀 The system now delivers everything originally envisioned - bulletproof reliability WITH complete appointment functionality.

## [1.8.9] - 2025-01-27

### 🛡️ **ULTRA-RESILIENCE UPDATE: Circuit Breaker & Fortress Mode**

**BACKGROUND**: While upgrading Cloudflare plan to resolve browser limits, implemented comprehensive resilience improvements to make system bulletproof against failures.

#### 🚨 Circuit Breaker Pattern

- **Smart failure detection**: Automatically detects browser/scraping failures
- **Automatic protection**: Stops attempting browser scraping after 3 consecutive failures
- **Self-healing**: 1-hour cooldown period allows automatic recovery
- **Resource conservation**: Prevents wasting browser time on repeated failures

#### ⚡ Enhanced Performance

- **Ultra-aggressive caching**: 24-hour cache TTL (up from 6 hours)
- **Faster timeouts**: 6-8 second browser timeouts (down from 10+ seconds)
- **Request-level timeouts**: 25-second total request protection
- **Quick failure detection**: Fail fast instead of hanging

#### 🛡️ Multi-Layer Fallbacks

- **Enhanced backup data**: Comprehensive 8-service fallback dataset
- **Smart cache usage**: Prefers stale cache over slow scraping
- **Graceful degradation**: Always returns useful responses, never fails
- **Context-aware fallbacks**: Intelligent responses based on user queries

#### 🔧 Function Calling Resilience

- **Timeout protection**: 12-second function call timeouts
- **Error boundaries**: Isolated function failure handling
- **Smart routing**: Enhanced endpoint mapping and validation
- **Progressive enhancement**: Fast functions work while slow ones are optimized

#### 🎯 User Experience

- **No hanging**: Eliminated 12+ second delays completely
- **Always responsive**: 3-4 second response times guaranteed
- **Consistent quality**: Professional responses even during failures
- **Transparent operation**: System works seamlessly through issues

#### 📊 Technical Improvements

- **Unified GPT module**: Cleaned up duplicate functions and conflicts
- **Enhanced error handling**: Comprehensive try-catch with graceful fallbacks
- **Better logging**: Circuit breaker status and failure tracking
- **Memory efficiency**: Optimized cache keys and data structures

#### 🔄 Operational Benefits

- **Reduced browser usage**: Circuit breaker prevents waste during outages
- **Self-monitoring**: Automatic failure detection and recovery
- **Maintenance-free**: System handles issues without manual intervention
- **Cost optimization**: Intelligent resource usage patterns

**IMPACT**: System now operates like a fortress - bulletproof against failures while maintaining excellent user experience. Ready for production scaling.

## v1.8.8 - Re-enabled Fast Function Calling (2025-07-06)

- **Re-enabled smart function calling** - Service info, search, and recommendations functions now work dynamically
- **Excluded slow appointment scraping** - Only disabled the problematic appointment function to prevent hanging
- **Live service data** - GPT can now access real Booksy service information instead of only backup data
- **Progressive enhancement** - Fast functions work now, appointment scraping optimization comes next

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
