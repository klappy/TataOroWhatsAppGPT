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
      const { slots, selectedDate } = await this.extractTimeSlotsFromFrame(bookingFrame);

      this.log(`✅ Found ${slots.length} available slots for ${selectedDate}`);

      return {
        serviceName,
        selectedDate,
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
      this.log("🔍 Looking for booking iframe...");

      // Wait for iframe to appear with timeout
      try {
        await this.page.waitForSelector('iframe[data-testid="booking-widget"]', { timeout: 10000 });
        this.log("✅ Found booking iframe!");

        // Get the iframe element
        const iframeElement = await this.page.$('iframe[data-testid="booking-widget"]');
        if (!iframeElement) {
          this.log("❌ Could not get iframe element");
          return null;
        }

        // Get the iframe src for logging
        const iframeSrc = await iframeElement.getAttribute("src");
        this.log(`🎯 Booking iframe src: ${iframeSrc}`);

        // Get the frame object
        const frame = await iframeElement.contentFrame();
        if (!frame) {
          this.log("❌ Could not access iframe content");
          return null;
        }

        this.log("✅ Successfully accessed iframe content");
        return frame;
      } catch (timeoutError) {
        this.log("⚠️ Specific booking iframe not found, trying fallback...");
      }

      // Fallback: try to find any iframe
      const frames = await this.page.frames();
      this.log(`📱 Found ${frames.length} frames total`);

      for (const frame of frames) {
        const frameUrl = frame.url();
        const frameName = frame.name();

        this.log(`📱 Frame: ${frameName || "unnamed"} | URL: ${frameUrl}`);

        if (
          frameUrl.includes("widget") ||
          frameUrl.includes("booking") ||
          frameUrl.includes("booksy.com/widget")
        ) {
          this.log(`🎯 Found potential booking iframe: ${frameUrl}`);
          return frame;
        }
      }

      this.log("❌ No suitable iframe found");
      return null;
    } catch (error) {
      this.log("❌ Error finding iframe:", error.message);
      return null;
    }
  }

  async extractTimeSlotsFromFrame(frame) {
    const slots = [];
    let selectedDate = "Unknown Date"; // Move this outside the try block

    try {
      this.log("🕐 Looking for time slots inside iframe...");
      try {
        this.log("📅 Detecting selected date...");

        // Look for the selected date in the calendar swiper
        try {
          // Find the swiper slide with data-selected="true" and class="active"
          const selectedSlide = await frame.$(
            '.swiper-slide[data-selected="true"].active, .swiper-slide.swiper-slide-active[data-selected="true"]'
          );

          if (selectedSlide) {
            const dateAttr = await selectedSlide.getAttribute("data-date");
            const monthAttr = await selectedSlide.getAttribute("data-month");
            const yearAttr = await selectedSlide.getAttribute("data-year");

            if (dateAttr && monthAttr && yearAttr) {
              // Extract day from the data-date attribute directly (YYYY-MM-DD format)
              const dayNumber = dateAttr.split("-")[2]; // Get the day part from YYYY-MM-DD

              // Extract day of week directly from the HTML content (more reliable than Date parsing)
              let dayOfWeek = "Unknown";
              try {
                const dayElement = await selectedSlide.$(".text-h5");
                if (dayElement) {
                  const dayText = await dayElement.textContent();
                  // Convert short day names to full names
                  const dayMap = {
                    Sun: "Sunday",
                    Mon: "Monday",
                    Tue: "Tuesday",
                    Wed: "Wednesday",
                    Thu: "Thursday",
                    Fri: "Friday",
                    Sat: "Saturday",
                  };
                  dayOfWeek = dayMap[dayText] || dayText;
                }
              } catch (e) {
                this.log(`⚠️ Could not extract day of week from HTML: ${e.message}`);
                // Fallback to Date parsing (but with timezone awareness)
                const dateObj = new Date(dateAttr + "T12:00:00"); // Add noon time to avoid timezone issues
                dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "long" });
              }

              selectedDate = `${dayOfWeek}, ${monthAttr} ${dayNumber}`;
              this.log(`📅 Found selected date from calendar: ${selectedDate} (${dateAttr})`);
            }
          } else {
            this.log("⚠️ No selected calendar slide found, trying alternative approach...");

            // Fallback: look for any active slide in the calendar
            const activeSlide = await frame.$(
              ".swiper-slide.active, .swiper-slide.swiper-slide-active"
            );
            if (activeSlide) {
              const dateAttr = await activeSlide.getAttribute("data-date");
              if (dateAttr) {
                const dateObj = new Date(dateAttr);
                const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "long" });
                const monthDay = dateObj.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
                selectedDate = `${dayOfWeek}, ${monthDay}`;
                this.log(`📅 Found active date: ${selectedDate} (${dateAttr})`);
              }
            }
          }
        } catch (calendarError) {
          this.log(`⚠️ Calendar date detection failed: ${calendarError.message}`);
        }

        // If no specific date found, try to get today's date and see if it matches
        if (selectedDate === "Unknown Date") {
          const today = new Date();
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          const todayStr = today.toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          });
          const tomorrowStr = tomorrow.toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          });

          this.log(
            `📅 Checking if selected date is today (${todayStr}) or tomorrow (${tomorrowStr})`
          );

          // Default assumption - most booking systems default to today or next available day
          selectedDate = `Today (${todayStr})`;
        }
      } catch (dateError) {
        this.log(`⚠️ Could not detect selected date: ${dateError.message}`);
        selectedDate = "Unknown Date - Please verify in booking interface";
      }

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
          return { slots: [], selectedDate };
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
              date: selectedDate,
              time: timeText.trim(),
              period: dayPart,
              testId: testId || "unknown",
            });

            this.log(`✅ Available slot: ${timeText.trim()} on ${selectedDate} (${dayPart})`);
          }
        } catch (elementError) {
          this.log(`⚠️ Error processing time slot element: ${elementError.message}`);
        }
      }
    } catch (error) {
      this.log("❌ Error extracting time slots from iframe:", error.message);
    }

    return { slots, selectedDate };
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
