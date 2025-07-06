# ADR 017: Retry Logic and User Communication Strategy

## Status

Accepted

## Context

Browser scraping operations occasionally fail due to network issues, browser limits, or page load timing. Users were experiencing:

- Silent failures with no explanation for delays
- Single-attempt failures when retries might succeed
- Confusion about whether the system was working during longer operations
- Loss of trust when technical issues occurred without communication

## Decision

Implement a two-attempt retry strategy with transparent user communication:

### Retry Logic

- **First Attempt**: 12-second timeout for normal operations
- **Retry Attempt**: 15-second timeout with more generous timing
- **Failure Tracking**: Only count circuit breaker failures after both attempts fail
- **Progressive Enhancement**: Second attempts often succeed when network/timing issues resolve

### User Communication

- **Retry Notifications**: Function-specific messages like "I'm having trouble getting the latest service info. Let me try again! ⏳"
- **Success Celebration**: "Great! I was able to get the current details on my second attempt!"
- **Honest Failure Handling**: "I tried twice but had some technical issues. Here's what I can tell you based on our reliable backup data!"
- **Always Provide Value**: Even with technical failures, users receive helpful information

### Technical Implementation

- Modified `executeBooksyFunction()` to accept attempt parameter
- Added `generateRetryMessage()` and `generateFailureMessage()` for context-aware communication
- Enhanced GPT conversation flow to include retry context in system messages
- User Agent versioning to track retry attempts in logs: `TataOro-WhatsApp-GPT/1.9.0-retry-${attempt}`

## Consequences

### Positive

- **Higher Success Rates**: Second attempts often succeed (network timing, browser state recovery)
- **Better User Experience**: Users understand what's happening and trust the system is working hard
- **Professional Feel**: Handles technical issues like a human assistant would
- **Reduced Support**: Users don't assume the bot is broken during temporary issues

### Trade-offs

- **Slightly Longer Response Times**: Maximum 27 seconds instead of 12 (15s retry + 12s initial)
- **Increased Browser Usage**: Up to 2x browser time per failed operation
- **More Complex Code**: Retry logic adds conditional paths and state management

### Monitoring

- Enhanced logging with attempt numbers for debugging
- Retry success/failure metrics for optimization
- User communication effectiveness tracking

## Date

2025-01-27

## Scope

All Booksy function calls and browser scraping operations in the GPT integration
