# Changelog

## [1.9.1] - 2025-01-27

- **Retry Logic**: Functions now attempt twice before fallback (12s → 15s timeouts)
- **User Communication**: Clear status messages during retries and transparent failure handling
- **Enhanced UX**: Users know when system is working hard vs experiencing issues
- **Higher Success Rates**: Second attempts often succeed when first fails

## [1.9.0] - 2025-01-27

- **Full Appointment Functionality**: Re-enabled `get_available_appointments` with upgraded browser capacity
- **Enhanced Timeouts**: Optimized for higher browser limits (10s browser, 8s selectors, 12s evaluation)
- **Complete Function Set**: All 5 Booksy functions operational with real-time data
- **Live Calendar Integration**: Actual appointment times with date preferences

## [1.8.9] - 2025-01-27

- **Circuit Breaker Pattern**: Automatic failure detection and 1-hour recovery cycles
- **Ultra-Aggressive Caching**: 24-hour TTL to minimize browser usage
- **Multi-Layer Fallbacks**: Comprehensive backup responses for all failure scenarios
- **Enhanced Resilience**: 3-4 second guaranteed response times with graceful degradation

## [1.8.8] - 2025-01-27

- **Re-enabled Function Calling**: Fast service functions operational (excluding slow appointments)
- **Enhanced Formatting**: Emoji-rich, readable service information with warm introductions
- **Improved UX Flow**: Professional bot introduction and better client branching
- **Fixed Performance**: Eliminated hanging with 3-4 second response guarantee

## [1.8.7] - 2025-01-27

- **Warm Introductions**: Bot now introduces itself and explains Tata's services
- **Better Readability**: Service info broken into digestible chunks with emojis
- **Enhanced Formatting**: Service-specific emojis and professional presentation
- **Improved Navigation**: Correct Booksy search instructions

## [1.8.6] - 2025-01-27

- **Appointment Infrastructure**: Complete scraping system for future activation
- **Enhanced Search Instructions**: Specific guidance for Booksy navigation
- **Performance Optimizations**: 6+ second wait times for complex page loading
- **Ready for Upgrade**: Infrastructure prepared for browser capacity increase

## [1.8.5] - 2025-01-27

- **Enhanced Search Instructions**: Specified correct Booksy search box location
- **Appointment Scraping Foundation**: Built infrastructure for real-time availability
- **Extended Timeouts**: Improved calendar loading detection
- **Better User Guidance**: Clear booking flow instructions

## [1.8.4] - 2025-01-27

- **Emergency Stability Fix**: Disabled function calling to eliminate 12+ second hangs
- **Enhanced Backup Data**: Comprehensive service information in system prompt
- **Performance Priority**: Guaranteed fast responses over live data during issues
- **Graceful Degradation**: Professional fallback responses

## [1.8.3] - 2025-01-27

- **Performance Crisis Response**: Increased timeouts and optimized caching
- **Playwright Optimization**: Switched to faster page load detection
- **Enhanced Caching**: Prefer stale cache over slow scraping
- **Extended Timeouts**: 15-second function calls, 2-hour cache TTL

## [1.8.2] - 2025-01-27

- **Smart Client Branching**: Skip questions when client status is clear
- **Immediate Service Display**: Show services without asking clarifying questions
- **Enhanced UX Flow**: New vs returning client detection and appropriate responses

## [1.8.1] - 2025-01-27

- **Dynamic MCP Server**: Live Booksy scraping with Playwright
- **Function Calling**: 4 specialized Booksy functions for real-time data
- **Smart Caching**: 1-hour TTL with graceful degradation
- **Removed Hardcoded Logic**: Eliminated 270+ lines of primitive string matching

## [1.8.0] - 2025-01-27

- **Major Architecture Overhaul**: Replaced hardcoded service detection with dynamic scraping
- **GPT Function Calling**: Natural language processing instead of exact phrase matching
- **Live Service Data**: Real-time Booksy information via Cloudflare Workers + Playwright
- **Enhanced User Experience**: Flexible service requests and intelligent responses
