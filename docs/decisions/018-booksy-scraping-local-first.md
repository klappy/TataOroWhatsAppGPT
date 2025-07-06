# Decision: Test Booksy Scraping Locally First

## Status
Accepted

## Context
We've been deploying untested Booksy scraping code directly to production, resulting in:
- Multiple failed deployments
- No visibility into why scraping fails
- Wasted time debugging in production
- User frustration with non-functional features

## Decision
We will ALWAYS test Booksy scraping logic locally with a visible browser before deploying to production.

## Implementation
1. Create `test-booksy-local.js` that runs Playwright with:
   - Visible browser (headless: false)
   - Slow motion (500ms delays)
   - Screenshot capture at each step
   - Detailed console logging

2. Create shared `BooksyScraper` class that works in both environments:
   - Same core logic for local and production
   - Different browser initialization only
   - Debug mode for verbose logging

3. Development workflow:
   - Write/modify scraping logic
   - Test with local script until it extracts real data
   - Move proven logic to shared class
   - Deploy to production with confidence

## Consequences

### Positive
- Can see exactly what the scraper is doing
- Faster debugging with browser DevTools
- Catch issues before they reach production
- Build confidence that code actually works
- Document expected behavior with screenshots

### Negative
- Slightly longer development cycle
- Need to maintain local test environment
- Booksy might behave differently in headless mode

### Mitigation
- The time saved debugging production failures far exceeds local testing time
- Use same user agent and viewport in both environments
- If headless-specific issues arise, can test headless locally too

## Example Code

```javascript
// Local testing
const browser = await chromium.launch({
  headless: false,
  slowMo: 500,
  devtools: true
});

// Production
const browser = await launch(env.BROWSER);

// Both use same scraper
const scraper = new BooksyScraper(page);
const slots = await scraper.getAvailableSlots(serviceName);
```

## Lessons Learned
- "It works on my machine" is better than "it doesn't work in production"
- Visibility is crucial for web scraping
- Local testing catches 90% of issues
- Screenshots are worth 1000 console.logs
