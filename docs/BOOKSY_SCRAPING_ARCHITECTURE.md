# Booksy Scraping Architecture

## 🎯 Core Principle: Test Locally First, Deploy Only What Works

### The Problem We're Solving
- Booksy shows available appointment slots in their UI
- Our bot needs to extract these slots and show them to WhatsApp users
- Previous attempts failed because we deployed untested code to production

### The Solution: Clean Architecture with Local Testing

## 📐 Architecture Overview

```
┌─────────────────────┐     ┌─────────────────────┐
│   Local Testing     │     │    Production       │
├─────────────────────┤     ├─────────────────────┤
│ test-booksy-local.js│     │ workers/booksy-     │
│                     │     │ dynamic.js          │
│ Uses:               │     │ Uses:               │
│ - Local Chromium    │     │ - Cloudflare Browser│
│ - Visible browser   │     │ - Headless mode     │
│ - Detailed logging  │     │ - Minimal logging   │
│                     │     │                     │
│     ▼               │     │     ▼               │
├─────────────────────┤     ├─────────────────────┤
│  BooksyScraper      │     │  BooksyScraper      │
│  (shared class)     │     │  (same class)       │
├─────────────────────┤     ├─────────────────────┤
│ - getAvailableSlots │     │ - getAvailableSlots │
│ - clickBookButton   │     │ - clickBookButton   │
│ - extractSlots      │     │ - extractSlots      │
└─────────────────────┘     └─────────────────────┘
```

## 🔧 Development Workflow

### 1. **Always Start Local**
```bash
# Run the local test with visible browser
node test-booksy-local.js

# Watch what happens:
# - Does it find the Book button?
# - Does the calendar load?
# - Can it click days and periods?
# - Does it extract time slots?
```

### 2. **Iterate Until Perfect**
- If it fails, you can see exactly where
- Take screenshots at each step
- Add more logging
- Adjust selectors based on what you see
- **DO NOT PROCEED TO PRODUCTION UNTIL THIS WORKS**

### 3. **Extract Core Logic**
Once the local test works perfectly:
```javascript
// shared/BooksyScraper.js
export class BooksyScraper {
  constructor(page, options = {}) {
    this.page = page;
    this.debug = options.debug || false;
  }
  
  async getAvailableSlots(serviceName) {
    // The EXACT logic that worked locally
  }
}
```

### 4. **Deploy to Production**
```javascript
// workers/booksy-dynamic.js
import { launch } from "@cloudflare/playwright";
import { BooksyScraper } from "../shared/BooksyScraper.js";

async function getAvailableAppointments(env, serviceName) {
  const browser = await launch(env.BROWSER);
  const page = await browser.newPage();
  
  const scraper = new BooksyScraper(page, { debug: false });
  const result = await scraper.getAvailableSlots(serviceName);
  
  await browser.close();
  return result;
}
```

## 📊 Expected Output Format

The scraper MUST return data in this exact format:
```json
{
  "serviceName": "Curly Adventure (Regular client)",
  "slots": [
    {
      "date": "Monday, July 7",
      "time": "12:30 PM",
      "period": "Afternoon"
    },
    {
      "date": "Monday, July 7", 
      "time": "12:45 PM",
      "period": "Afternoon"
    },
    {
      "date": "Monday, July 7",
      "time": "1:00 PM", 
      "period": "Afternoon"
    }
  ],
  "totalSlots": 3,
  "scrapedAt": "2025-01-27T10:30:00Z"
}
```

## 🐛 Debugging Checklist

When the scraper fails:

1. **Run Locally First**
   - Can you reproduce the issue with `test-booksy-local.js`?
   - What do the screenshots show?
   - Where in the logs does it fail?

2. **Common Issues**
   - [ ] Calendar takes longer to load → Increase wait times
   - [ ] Selectors changed → Update based on DevTools inspection
   - [ ] Service name mismatch → Check exact text on page
   - [ ] Time slots behind tabs → Ensure clicking period tabs
   - [ ] Days not clickable → Check for disabled state

3. **Never Deploy Blind**
   - If you can't get it working locally, it won't work in production
   - Production has less visibility, stricter timeouts, no DevTools

## 🚀 Deployment Checklist

Before deploying ANY scraper changes:

- [ ] Local test passes with real data extracted
- [ ] Screenshots show expected UI state
- [ ] Output format matches specification
- [ ] Error handling for common failures
- [ ] Reasonable timeouts (not too short, not too long)
- [ ] Version bumped in package.json
- [ ] CHANGELOG.md updated
- [ ] Tested with multiple services (not just one)

## 📈 Success Metrics

You know the scraper is working when:

1. **Local Test**: Extracts same slots you see in browser
2. **API Endpoint**: Returns real slots, not empty arrays
3. **WhatsApp Bot**: Shows actual available times to users
4. **Error Rate**: < 10% failure rate in production

## 🔄 Continuous Improvement

1. **Monitor Production**
   - Log success/failure rates
   - Track which selectors fail most often
   - Note when Booksy changes their UI

2. **Update Process**
   - When scraper breaks, START WITH LOCAL TEST
   - Fix locally first
   - Deploy only proven fixes
   - Document what changed and why

## ⚠️ What NOT to Do

1. **Don't deploy untested code**
2. **Don't guess at selectors**
3. **Don't add features while fixing bugs**
4. **Don't skip the local testing phase**
5. **Don't assume production will work differently**

## 🎯 The Golden Rule

**If it doesn't work locally with a visible browser, it will NEVER work in production.**

Test locally. Fix locally. Deploy globally.
