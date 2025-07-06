#!/usr/bin/env node

/**
 * Local test script for Booksy appointment scraping
 * Updated to handle iframe-based booking interface
 */

import { chromium } from "playwright";

const BOOKSY_URL =
  "https://booksy.com/en-us/155582_akro-beauty-by-la-morocha-makeup_hair-salon_134763_orlando/staffer/880999";

class BooksyScraper {
  constructor(page, options = {}) {
    this.page = page;
    this.debug = options.debug || false;
  }

  log(...args) {
    if (this.debug) {
      console.log(`[${new Date().toISOString()}]`, ...args);
    }
  }

  async getAvailableSlots(serviceName) {
    this.log(`🚀 Starting appointment detection for: ${serviceName}`);

    try {
      // Navigate to Booksy page
      this.log("📍 Navigating to Booksy URL...");
      await this.page.goto(BOOKSY_URL, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      // Wait for initial load
      this.log("⏳ Waiting for page to stabilize...");
      await this.page.waitForTimeout(3000);

      // Take screenshot of initial state
      await this.page.screenshot({ path: "booksy-1-initial.png" });
      this.log("📸 Screenshot saved: booksy-1-initial.png");

      // Try to find and click the service Book button
      this.log(`🔍 Looking for Book button for service: ${serviceName}`);

      const bookClicked = await this.clickServiceBookButton(serviceName);

      if (!bookClicked) {
        this.log("❌ Could not find Book button for service");
        return { error: "Service Book button not found", serviceName };
      }

      // Wait for booking modal/iframe to appear
      this.log("📅 Waiting for booking interface to load...");
      await this.page.waitForTimeout(5000);

      // Take screenshot after clicking Book
      await this.page.screenshot({ path: "booksy-2-after-book.png" });
      this.log("📸 Screenshot saved: booksy-2-after-book.png");

      // Look for and switch to iframe
      const bookingFrame = await this.findBookingIframe();

      if (!bookingFrame) {
        this.log("❌ Could not find booking iframe");
        return { error: "Booking iframe not found", serviceName };
      }

      // Extract time slots from the iframe
      const slots = await this.extractTimeSlotsFromFrame(bookingFrame);

      this.log(`✅ Found ${slots.length} available slots`);

      return {
        serviceName,
        slots,
        totalSlots: slots.length,
        scrapedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.log("❌ Error during scraping:", error.message);
      await this.page.screenshot({ path: "booksy-error.png" });
      return {
        error: error.message,
        serviceName,
        screenshot: "booksy-error.png",
      };
    }
  }

  async clickServiceBookButton(serviceName) {
    try {
      this.log(`🔍 Looking for service with data-testid attributes...`);

      // Find the Book button for our specific service
      const bookButton = await this.page
        .locator('h4[data-testid="service-name"]')
        .filter({ hasText: serviceName })
        .locator("xpath=..") // Go up to parent
        .locator("xpath=..") // Go up another level
        .locator('button[data-testid="service-button"]')
        .first();

      // Check if button exists
      const buttonExists = (await bookButton.count()) > 0;

      if (buttonExists) {
        const buttonText = await bookButton.textContent();
        this.log(`🔘 Found Book button: "${buttonText.trim()}"`);

        // Click the button
        await bookButton.click();
        this.log(`✅ Clicked Book button successfully`);
        return true;
      } else {
        this.log(`⚠️ No Book button found for service`);
        return false;
      }
    } catch (error) {
      this.log("❌ Error clicking service book button:", error.message);
      return false;
    }
  }

  async findBookingIframe() {
    try {
      this.log("🔍 Looking for booking modal and iframe...");

      // First, let's see what modals actually exist
      const allModals = await this.page.$$('div[class*="modal"], [role="modal"], [role="dialog"]');
      this.log(`🔍 Found ${allModals.length} modal-like elements`);

      for (let i = 0; i < allModals.length; i++) {
        const modal = allModals[i];
        const modalClass = await modal.getAttribute("class");
        const modalRole = await modal.getAttribute("role");
        this.log(`📦 Modal ${i}: class="${modalClass}" role="${modalRole}"`);
      }

      // Look for any iframe with booking-related attributes
      const allIframes = await this.page.$$("iframe");
      this.log(`🔍 Found ${allIframes.length} iframe elements`);

      for (let i = 0; i < allIframes.length; i++) {
        const iframe = allIframes[i];
        const src = await iframe.getAttribute("src");
        const testId = await iframe.getAttribute("data-testid");
        const id = await iframe.getAttribute("id");
        this.log(`📱 Iframe ${i}: src="${src}" data-testid="${testId}" id="${id}"`);

        // Check if this is the booking iframe
        if (
          testId === "booking-widget" ||
          src?.includes("booking") ||
          src?.includes("widget") ||
          src?.includes("booksy.com/widget")
        ) {
          this.log(`🎯 Found booking iframe: ${src}`);

          // Get the frame object
          const frame = await iframe.contentFrame();
          if (frame) {
            this.log("✅ Successfully accessed iframe content");
            return frame;
          } else {
            this.log("❌ Could not access iframe content");
          }
        }
      }

      // Fallback: try to find any iframe
      try {
        this.log("🔄 Trying fallback iframe detection...");
        const frames = await this.page.frames();
        this.log(`📱 Found ${frames.length} frames total`);

        // Look for the booking iframe (might have specific src or name)
        for (const frame of frames) {
          const frameUrl = frame.url();
          const frameName = frame.name();

          this.log(`📱 Frame: ${frameName || "unnamed"} | URL: ${frameUrl}`);

          // Check if this frame contains booking-related content
          if (
            frameUrl.includes("widget") ||
            frameUrl.includes("booking") ||
            frameUrl.includes("appointment") ||
            frameUrl.includes("calendar") ||
            frameName.includes("booking") ||
            frameUrl.includes("booksy.com/widget")
          ) {
            this.log(`🎯 Found potential booking iframe: ${frameUrl}`);
            return frame;
          }
        }

        // If no specific booking frame found, try the first non-main frame
        const nonMainFrames = frames.filter((f) => f !== this.page.mainFrame());
        if (nonMainFrames.length > 0) {
          this.log(`🔄 Using first non-main frame as fallback`);
          return nonMainFrames[0];
        }
      } catch (fallbackError) {
        this.log("❌ Fallback iframe detection also failed:", fallbackError.message);
      }

      return null;
    } catch (error) {
      this.log("❌ Error finding iframe:", error.message);
      return null;
    }
  }

  async extractTimeSlotsFromFrame(frame) {
    const slots = [];

    try {
      this.log("🕐 Looking for time slots inside iframe...");

      // Wait for the time slot carousel to load inside the iframe
      try {
        await frame.waitForSelector(".swiper-wrapper", { timeout: 10000 });
        this.log("📅 Found time slot carousel in iframe");
      } catch (timeoutError) {
        this.log("⚠️ Swiper wrapper not found, trying alternative selectors...");

        // Try alternative selectors for time slots
        const alternatives = [
          'a[data-testid^="time-slot-"]',
          '[class*="time-slot"]',
          '[class*="time"]',
          "button",
          ".chip",
        ];

        let found = false;
        for (const selector of alternatives) {
          try {
            await frame.waitForSelector(selector, { timeout: 2000 });
            this.log(`📅 Found alternative selector: ${selector}`);
            found = true;
            break;
          } catch (e) {
            // Continue to next selector
          }
        }

        if (!found) {
          this.log("❌ No time slot elements found in iframe");
          return slots;
        }
      }

      // Find all time slot elements using the data-testid pattern
      const timeSlotElements = await frame.$$('a[data-testid^="time-slot-"]');
      this.log(`🕐 Found ${timeSlotElements.length} time slot elements in iframe`);

      if (timeSlotElements.length === 0) {
        // Try broader search
        this.log("🔍 Trying broader search for time elements...");
        const allElements = await frame.$$('a, button, [class*="time"], [class*="slot"], .chip');
        this.log(`🔍 Found ${allElements.length} potential elements in iframe`);

        for (const element of allElements) {
          const text = await element.textContent();
          if (text && /\d{1,2}:\d{2}\s*(AM|PM)/i.test(text)) {
            this.log(`⏰ Found time element: ${text}`);
            timeSlotElements.push(element);
          }
        }
      }

      for (const element of timeSlotElements) {
        try {
          // Get the time text
          const timeText = await element.textContent();

          // Get the data-testid to extract more info
          const testId = await element.getAttribute("data-testid");

          // Try to get day part info
          let dayPart = "Unknown";
          try {
            const parentSlide = await element.locator("xpath=../..").first();
            dayPart = (await parentSlide.getAttribute("data-daypart")) || "Unknown";
          } catch (e) {
            // Day part not available
          }

          // Check if the element is clickable (not disabled)
          const isDisabled = await element.evaluate((el) => {
            return (
              el.classList.contains("disabled") ||
              el.getAttribute("aria-disabled") === "true" ||
              el.style.pointerEvents === "none"
            );
          });

          if (!isDisabled && timeText && timeText.trim()) {
            slots.push({
              date: "Default Selected Date",
              time: timeText.trim(),
              period: dayPart,
              testId: testId || "unknown",
            });

            this.log(`✅ Available slot: ${timeText.trim()} (${dayPart})`);
          }
        } catch (elementError) {
          this.log(`⚠️ Error processing time slot element: ${elementError.message}`);
        }
      }
    } catch (error) {
      this.log("❌ Error extracting time slots from iframe:", error.message);
    }

    return slots;
  }
}

// Main test function
async function runTest() {
  console.log("🚀 Starting Booksy scraper test with iframe support...\n");

  const browser = await chromium.launch({
    headless: false, // See what's happening
    slowMo: 500, // Slow down actions to observe
    devtools: true, // Open devtools
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();

  // Create scraper instance
  const scraper = new BooksyScraper(page, { debug: true });

  // Test the scraper
  const serviceName = "Curly Adventure (Regular client)";
  console.log(`\n🔍 Testing service: ${serviceName}\n`);

  const result = await scraper.getAvailableSlots(serviceName);

  console.log("\n📊 RESULTS:");
  console.log(JSON.stringify(result, null, 2));

  // Keep browser open for inspection
  console.log("\n⏸️  Browser will stay open for 60 seconds for inspection...");
  await page.waitForTimeout(60000);

  await browser.close();
  console.log("\n✅ Test complete!");
}

// Run the test
runTest().catch(console.error);
