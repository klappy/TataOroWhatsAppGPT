/**
 * Dynamic Booksy MCP Server - Scrapes live service data from Booksy
 *
 * Provides real-time service information instead of hardcoded static data.
 * Uses Playwright to scrape the actual Booksy booking page.
 */

import { launch } from "@cloudflare/playwright";
import { getNextNDates, getNextWeekdayDate, parseWeekdayName } from "../shared/dateUtils.js";

const BOOKSY_URL =
  "https://booksy.com/en-us/155582_akro-beauty-by-la-morocha-makeup_hair-salon_134763_orlando/staffer/880999";
const CACHE_TTL = 86400; // 24 hour cache - ultra aggressive to minimize browser usage
const CIRCUIT_BREAKER_TTL = 120; // 2 minutes circuit breaker cooldown
const MAX_FAILURES = 2; // Trip circuit breaker after 2 consecutive failures

// Enhanced timeouts with upgraded browser capacity
const BROWSER_TIMEOUT = 10000; // 10 seconds (up from 8) - more generous with upgraded plan
const SELECTOR_WAIT_TIMEOUT = 8000; // 8 seconds (up from 6) - better success rate
const EVALUATION_TIMEOUT = 12000; // 12 seconds (up from 10) - more thorough scraping

const SERVICES_CACHE_TTL = 3600; // 1 hour for services (prices, descriptions)
const APPOINTMENTS_CACHE_TTL = 300; // 5 minutes for appointment availability

/**
 * Circuit breaker to prevent wasting browser time on consecutive failures
 */
async function isCircuitBreakerOpen(env) {
  try {
    const breakerState = await env.CHAT_HISTORY.get("booksy:circuit_breaker");
    if (!breakerState) return false;

    const state = JSON.parse(breakerState);
    const now = Date.now();

    // If cooldown period has passed, reset the circuit breaker
    if (now - state.lastFailure > CIRCUIT_BREAKER_TTL * 1000) {
      await env.CHAT_HISTORY.delete("booksy:circuit_breaker");
      return false;
    }

    // Circuit breaker is open if we have too many failures
    return state.failures >= MAX_FAILURES;
  } catch (error) {
    console.error("Circuit breaker check failed:", error);
    return false; // Default to allowing attempts
  }
}

/**
 * Record a scraping failure for circuit breaker
 */
async function recordScrapingFailure(env) {
  try {
    const existing = await env.CHAT_HISTORY.get("booksy:circuit_breaker");
    const state = existing ? JSON.parse(existing) : { failures: 0, lastFailure: 0 };

    state.failures += 1;
    state.lastFailure = Date.now();

    await env.CHAT_HISTORY.put("booksy:circuit_breaker", JSON.stringify(state), {
      expirationTtl: CIRCUIT_BREAKER_TTL,
    });

    console.log(`🚨 Circuit breaker: ${state.failures}/${MAX_FAILURES} failures`);
  } catch (error) {
    console.error("Failed to record scraping failure:", error);
  }
}

/**
 * Reset circuit breaker on successful scraping
 */
async function resetCircuitBreaker(env) {
  try {
    await env.CHAT_HISTORY.delete("booksy:circuit_breaker");
    console.log("✅ Circuit breaker reset - scraping successful");
  } catch (error) {
    console.error("Failed to reset circuit breaker:", error);
  }
}

/**
 * Scrape live services from Booksy page with enhanced resilience
 */
async function scrapeBooksyServices(env) {
  // Check circuit breaker first - don't waste browser time if we're failing consistently
  const circuitOpen = await isCircuitBreakerOpen(env);
  if (circuitOpen) {
    console.log("🚫 Circuit breaker OPEN - skipping browser scraping");

    // Try to return cached data even if stale
    const cached = await getCachedServices(env);
    if (cached && cached.services.length > 4) {
      console.log("📦 Using stale cache due to circuit breaker");
      return cached.services;
    }

    // Final fallback
    console.log("🔄 Circuit breaker + no cache = fallback services");
    return getFallbackServices();
  }

  try {
    console.log("🌐 Attempting browser scraping...");

    // 🥷 STEALTH MODE: Launch browser with human-like configuration
    const browser = await launch(env.BROWSER, {
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-first-run",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-features=TranslateUI",
        "--disable-ipc-flooding-protection",
      ],
    });

    // Create context with realistic human-like settings
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1366, height: 768 },
      extraHTTPHeaders: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        DNT: "1",
        Connection: "keep-alive",
        "Cache-Control": "max-age=0",
      },
      timezoneId: "America/New_York",
      locale: "en-US",
      colorScheme: "light",
    });

    const page = await context.newPage();

    // 🎭 NINJA MODE: Hide automation detection
    await page.addInitScript(() => {
      // Remove webdriver property
      delete navigator.__proto__.webdriver;

      // Override the plugins property to avoid headless detection
      Object.defineProperty(navigator, "plugins", {
        get: () => [1, 2, 3, 4, 5],
      });

      // Override the languages property
      Object.defineProperty(navigator, "languages", {
        get: () => ["en-US", "en"],
      });

      // Override the hardwareConcurrency to look like real device
      Object.defineProperty(navigator, "hardwareConcurrency", {
        get: () => 4,
      });

      // Hide automation indicators
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
      });
    });

    console.log("🎭 Stealth mode activated - navigating to Booksy...");

    // Navigate with realistic behavior
    await page.goto(BOOKSY_URL, {
      waitUntil: "domcontentloaded",
      timeout: BROWSER_TIMEOUT,
    });

    // Add a small human-like delay
    await page.waitForTimeout(Math.random() * 2000 + 1000); // 1-3 second random delay

    // Shorter wait time - if services don't load quickly, bail out
    await page.waitForSelector(
      'div[role="button"], [data-cy*="service"], [data-testid*="service"], .service, .treatment, .menu-item, button[class*="service"], div[class*="item"], section[class*="service"]',
      {
        timeout: SELECTOR_WAIT_TIMEOUT,
      }
    );

    // Enhanced service extraction with timeout protection
    const services = await Promise.race([
      page.evaluate(() => {
        const extractedServices = [];

        // Same enhanced selectors as before but with performance focus
        const serviceContainerSelectors = [
          '[data-cy*="service"]',
          '[data-testid*="service"]',
          'div[role="button"]',
          'div[class*="service"]',
          'div[class*="treatment"]',
          'div[class*="menu-item"]',
          ".treatment-item",
          ".service-card",
          ".booking-service",
        ];

        // Try each selector pattern but limit processing time
        for (const selector of serviceContainerSelectors) {
          try {
            const elements = document.querySelectorAll(selector);

            // Process max 50 elements per selector to avoid timeouts
            const elementsToProcess = Math.min(elements.length, 50);

            for (let i = 0; i < elementsToProcess; i++) {
              const element = elements[i];

              // Quick name extraction
              const nameEl = element.querySelector(
                'h1, h2, h3, h4, h5, h6, [class*="title"], [class*="name"], strong, b'
              );
              if (!nameEl || !nameEl.textContent.trim()) continue;

              const extractedName = nameEl.textContent.trim();
              if (extractedName.length < 3 || extractedName.length > 150) continue;

              // Quick price/duration extraction
              const fullText = element.textContent || "";
              let extractedPrice = "Contact for pricing";
              let extractedDuration = "Duration varies";

              // Fast regex extraction
              const priceMatch = fullText.match(
                /\$\d+(?:\.\d{2})?(?:\s*-\s*\$\d+(?:\.\d{2})?)?|\$\d+\+?|Starting\s+\$\d+/i
              );
              if (priceMatch) extractedPrice = priceMatch[0];

              const durationMatch = fullText.match(
                /\d+(?:\.\d+)?\s*(?:hours?|hrs?|h\b|\d+\s*minutes?|\d+\s*mins?)/i
              );
              if (durationMatch) extractedDuration = durationMatch[0];

              // Avoid duplicates quickly
              const isDuplicate = extractedServices.some(
                (existing) => existing.name.toLowerCase() === extractedName.toLowerCase()
              );

              if (!isDuplicate) {
                extractedServices.push({
                  name: extractedName,
                  price: extractedPrice,
                  duration: extractedDuration,
                  description: "", // Skip description extraction for speed
                  scrapedAt: new Date().toISOString(),
                  selector: selector,
                });
              }

              // Break if we have enough services
              if (extractedServices.length >= 20) break;
            }

            if (extractedServices.length >= 20) break;
          } catch (e) {
            console.log(`Selector failed: ${selector}`, e);
            continue;
          }
        }

        return extractedServices;
      }),
      // Timeout the evaluation after 10 seconds
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Service extraction timeout")), EVALUATION_TIMEOUT)
      ),
    ]);

    await browser.close();

    // Only cache if we found real services
    if (services.length > 4) {
      await env.CHAT_HISTORY.put(
        `booksy:services:live`,
        JSON.stringify({
          services,
          lastUpdated: new Date().toISOString(),
          source: "live_scrape",
          serviceCount: services.length,
        }),
        { expirationTtl: SERVICES_CACHE_TTL }
      );

      // Reset circuit breaker on success
      await resetCircuitBreaker(env);
      console.log(`✅ Successfully scraped ${services.length} services`);
      return services;
    } else {
      console.log(`⚠️ Only found ${services.length} services - possible scraping issue`);
      await recordScrapingFailure(env);
      return getFallbackServices();
    }
  } catch (error) {
    console.error("🚨 Browser scraping failed:", error);

    // Record failure for circuit breaker
    await recordScrapingFailure(env);

    // Enhanced fallback chain
    console.log("🔄 Trying fallback chain...");

    // 1. Try cached data (even if stale)
    const cached = await getCachedServices(env);
    if (cached && cached.services.length > 4) {
      console.log("📦 Using stale cached services");
      return cached.services;
    }

    // 2. Final fallback
    console.log("🛡️ Using comprehensive fallback services");
    return getFallbackServices();
  }
}

/**
 * Enhanced cached services with resilience
 */
async function getCachedServices(env) {
  try {
    // Add timeout to cache retrieval
    const cached = await Promise.race([
      env.CHAT_HISTORY.get(`booksy:services:live`),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Cache read timeout")), 3000)),
    ]);

    if (cached) {
      const data = JSON.parse(cached);
      console.log(
        `📦 Retrieved ${data.services?.length || 0} cached services from ${data.lastUpdated}`
      );
      return data;
    }

    console.log("📦 No cached services found");
    return null;
  } catch (error) {
    console.error("❌ Cache retrieval failed:", error);
    // Don't throw - return null so we fall back gracefully
    return null;
  }
}

/**
 * Enhanced fallback services for maximum resilience
 */
function getFallbackServices() {
  return [
    {
      name: "Curly Adventure (First Time)",
      price: "$170",
      duration: "3-4 hours",
      description:
        "Complete curly hair transformation for new clients. Includes consultation, cut, and styling education.",
      fallback: true,
      category: "new_client",
    },
    {
      name: "Curly Adventure (Returning)",
      price: "$150",
      duration: "2-3 hours",
      description: "Curly cut and style for returning clients who understand their curl pattern.",
      fallback: true,
      category: "returning_client",
    },
    {
      name: "Blowout & Style",
      price: "$75",
      duration: "1.5 hours",
      description: "Professional blowout and styling service for special occasions or maintenance.",
      fallback: true,
      category: "styling",
    },
    {
      name: "Curl Refresh",
      price: "$60",
      duration: "1 hour",
      description: "Quick refresh and reshaping of existing curly cut between appointments.",
      fallback: true,
      category: "maintenance",
    },
    {
      name: "Hair Treatment",
      price: "$85",
      duration: "1 hour",
      description: "Deep conditioning and nourishing treatment for damaged or dry curls.",
      fallback: true,
      category: "treatment",
    },
    {
      name: "Consultation Only",
      price: "$50",
      duration: "45 minutes",
      description: "In-depth consultation to understand your curl pattern and create a care plan.",
      fallback: true,
      category: "consultation",
    },
    {
      name: "Color & Cut Package",
      price: "$250+",
      duration: "4-5 hours",
      description:
        "Complete color transformation with curly cut. Price varies based on color complexity.",
      fallback: true,
      category: "color",
    },
    {
      name: "Bridal/Event Styling",
      price: "$125",
      duration: "2 hours",
      description: "Special occasion styling for weddings, events, or photoshoots.",
      fallback: true,
      category: "special_event",
    },
  ];
}

/**
 * Smart service search with multiple fallback layers
 */
function searchServices(services, query) {
  if (!query || !services || services.length === 0) {
    return services || getFallbackServices();
  }

  try {
    const searchTerm = query.toLowerCase().trim();

    // Multi-layered search strategy
    const exactMatches = services.filter((service) =>
      service.name.toLowerCase().includes(searchTerm)
    );

    const categoryMatches = services.filter((service) =>
      service.category?.toLowerCase().includes(searchTerm)
    );

    const descriptionMatches = services.filter((service) =>
      service.description?.toLowerCase().includes(searchTerm)
    );

    // Combine results with deduplication
    const allMatches = [...new Set([...exactMatches, ...categoryMatches, ...descriptionMatches])];

    if (allMatches.length > 0) {
      console.log(`🔍 Found ${allMatches.length} matches for "${query}"`);
      return allMatches;
    }

    // Smart fallback - return services for common terms
    const commonTerms = {
      curly: services.filter((s) => s.name.toLowerCase().includes("curly")),
      cut: services.filter(
        (s) => s.name.toLowerCase().includes("cut") || s.name.toLowerCase().includes("adventure")
      ),
      color: services.filter((s) => s.name.toLowerCase().includes("color")),
      consultation: services.filter((s) => s.name.toLowerCase().includes("consultation")),
      first: services.filter((s) => s.category === "new_client"),
      new: services.filter((s) => s.category === "new_client"),
      returning: services.filter((s) => s.category === "returning_client"),
    };

    for (const [term, matches] of Object.entries(commonTerms)) {
      if (searchTerm.includes(term) && matches.length > 0) {
        console.log(`🔍 Smart match for "${term}": ${matches.length} services`);
        return matches;
      }
    }

    // Final fallback - return all services
    console.log("🔍 No specific matches, returning all services");
    return services;
  } catch (error) {
    console.error("❌ Search failed:", error);
    return services || getFallbackServices();
  }
}

/**
 * Enhanced service recommendations with error boundaries
 */
function getServiceRecommendations(clientType = "unknown") {
  try {
    const allServices = getFallbackServices();

    const recommendations = {
      new_client: {
        primary: allServices.filter((s) => s.category === "new_client"),
        secondary: allServices.filter((s) => s.category === "consultation"),
        description:
          "Perfect for discovering your curl pattern and starting your curly hair journey!",
      },
      returning_client: {
        primary: allServices.filter((s) => s.category === "returning_client"),
        secondary: allServices.filter(
          (s) => s.category === "maintenance" || s.category === "styling"
        ),
        description: "Great options for maintaining and enhancing your beautiful curls!",
      },
      unknown: {
        primary: allServices.slice(0, 4), // Top 4 services
        secondary: allServices.slice(4), // Rest of services
        description: "Here are Tata's most popular services to help you choose the perfect option!",
      },
    };

    const result = recommendations[clientType] || recommendations.unknown;

    console.log(
      `💡 Generated ${
        result.primary.length + result.secondary.length
      } recommendations for ${clientType}`
    );
    return result;
  } catch (error) {
    console.error("❌ Recommendations failed:", error);
    // Ultra-safe fallback
    return {
      primary: [getFallbackServices()[0]], // Just the main service
      secondary: [],
      description:
        "I can help you find the perfect service! Please visit Tata's Booksy page for complete options.",
    };
  }
}

/**
 * 🎉 BREAKTHROUGH: Get available appointment times with PROVEN calendar detection
 * @param {*} env - Environment variables
 * @param {*} serviceName - Name of the service to book
 * @param {*} preferredDates - Optional array of preferred dates to check
 */
async function getAvailableAppointments(env, serviceName, preferredDates = null) {
  console.log(`🚀 BREAKTHROUGH: Starting iframe-based appointment detection for ${serviceName}`);

  try {
    const browser = await launch(env.BROWSER, {
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-first-run",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-features=TranslateUI",
        "--disable-ipc-flooding-protection",
      ],
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1366, height: 768 },
      extraHTTPHeaders: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        DNT: "1",
        Connection: "keep-alive",
        "Cache-Control": "max-age=0",
      },
      timezoneId: "America/New_York",
      locale: "en-US",
      colorScheme: "light",
    });

    const page = await context.newPage();

    await page.addInitScript(() => {
      delete navigator.__proto__.webdriver;
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
      Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 4 });
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    console.log("🎯 Using proven iframe-based appointment detection...");

    // Navigate to Booksy page
    await page.goto(BOOKSY_URL, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    // Wait for initial page load
    await page.waitForTimeout(3000);

    console.log(`🔍 Looking for Book button for service: ${serviceName}`);

    // Find and click the Book button for the specific service (using proven logic)
    const bookClicked = await page.evaluate(async (targetServiceName) => {
      try {
        console.log(`🔍 Looking for service with data-testid attributes...`);

        // Find all service name headers
        const serviceHeaders = document.querySelectorAll('h4[data-testid="service-name"]');
        console.log(`Found ${serviceHeaders.length} service headers`);

        for (const header of serviceHeaders) {
          const headerText = header.textContent?.trim();
          console.log(`Checking service: "${headerText}"`);

          if (headerText && headerText.includes(targetServiceName)) {
            console.log(`🎯 Found matching service: "${headerText}"`);

            // Navigate up to find the Book button
            let currentElement = header;
            let attempts = 0;
            const maxAttempts = 5;

            while (currentElement && attempts < maxAttempts) {
              currentElement = currentElement.parentElement;
              attempts++;

              if (currentElement) {
                const bookButton = currentElement.querySelector(
                  'button[data-testid="service-button"]'
                );
                if (bookButton) {
                  const buttonText = bookButton.textContent?.trim();
                  console.log(`🔘 Found Book button: "${buttonText}"`);

                  // Click the button
                  bookButton.click();
                  console.log(`✅ Clicked Book button successfully`);
                  return true;
                }
              }
            }
          }
        }

        console.log(`⚠️ No Book button found for service: ${targetServiceName}`);
        return false;
      } catch (error) {
        console.log("❌ Error clicking service book button:", error.message);
        return false;
      }
    }, serviceName);

    if (!bookClicked) {
      console.log("❌ Could not find or click Book button for service");
      await browser.close();
      return {
        error: "Service Book button not found",
        serviceName,
        fallback: "Please visit the booking page directly to see available times",
      };
    }

    // Wait for booking interface to load (production timing - 4x longer than local)
    console.log("⏳ Waiting for booking interface to load (production timing)...");
    await page.waitForTimeout(20000); // 20 seconds (4x the 5 seconds local)

    // Try to find and access the booking iframe with multiple attempts
    console.log("🔍 Looking for booking iframe...");
    let bookingFrame = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`🔍 Attempt ${attempt}: Looking for booking iframe...`);

      try {
        await page.waitForSelector('iframe[data-testid="booking-widget"]', { timeout: 12000 }); // 12 seconds (4x the 3 seconds local)

        const iframeElement = await page.$('iframe[data-testid="booking-widget"]');
        if (iframeElement) {
          const iframeSrc = await iframeElement.getAttribute("src");
          console.log(`🎯 Booking iframe src: ${iframeSrc}`);

          bookingFrame = await iframeElement.contentFrame();
          if (bookingFrame) {
            console.log(`✅ Successfully accessed iframe content on attempt ${attempt}`);
            break;
          }
        }
      } catch (e) {
        console.log(`⚠️ Attempt ${attempt} failed: ${e.message}`);
        if (attempt < 3) {
          await page.waitForTimeout(8000); // Wait 8 seconds between attempts (4x the 2 seconds local)
        }
      }
    }

    // Fallback: try to find any iframe
    if (!bookingFrame) {
      console.log("⚠️ Specific booking iframe not found, trying fallback...");

      const frames = await page.frames();
      console.log(`📱 Found ${frames.length} frames total`);

      for (const frame of frames) {
        const frameUrl = frame.url();
        console.log(`📱 Frame URL: ${frameUrl}`);

        if (
          frameUrl.includes("widget") ||
          frameUrl.includes("booking") ||
          frameUrl.includes("booksy.com/widget")
        ) {
          console.log(`🎯 Found potential booking iframe: ${frameUrl}`);
          bookingFrame = frame;
          break;
        }
      }
    }

    if (!bookingFrame) {
      console.log("❌ Could not find booking iframe");
      await browser.close();
      return {
        error: "Booking iframe not found",
        serviceName,
        fallback: "Please visit the booking page directly to see available times",
      };
    }

    console.log("📅 Booking iframe detected, extracting time slots...");

    // Extract time slots and date from the iframe (using proven logic)
    const appointmentData = await bookingFrame.evaluate(async () => {
      const slots = [];
      let selectedDate = "Unknown Date";

      try {
        console.log("📅 Detecting selected date from calendar...");

        // Look for the selected date in the calendar swiper
        const selectedSlide = await new Promise((resolve) => {
          const checkSlide = () => {
            const slide = document.querySelector(
              '.swiper-slide[data-selected="true"].active, .swiper-slide.swiper-slide-active[data-selected="true"]'
            );
            if (slide) {
              resolve(slide);
            } else {
              setTimeout(checkSlide, 500);
            }
          };
          checkSlide();
          setTimeout(() => resolve(null), 5000); // 5 second timeout
        });

        if (selectedSlide) {
          const dateAttr = selectedSlide.getAttribute("data-date");
          const monthAttr = selectedSlide.getAttribute("data-month");
          const yearAttr = selectedSlide.getAttribute("data-year");

          if (dateAttr && monthAttr && yearAttr) {
            const dayNumber = dateAttr.split("-")[2];

            // Extract day of week from HTML
            let dayOfWeek = "Unknown";
            const dayElement = selectedSlide.querySelector(".text-h5");
            if (dayElement) {
              const dayText = dayElement.textContent;
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

            selectedDate = `${dayOfWeek}, ${monthAttr} ${dayNumber}`;
            console.log(`📅 Found selected date: ${selectedDate} (${dateAttr})`);
          }
        }

        // If no specific date found, use today as fallback
        if (selectedDate === "Unknown Date") {
          const today = new Date();
          selectedDate = today.toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          });
          console.log(`📅 Using today as fallback: ${selectedDate}`);
        }

        console.log("🕐 Looking for time slots...");

        // Wait for time slot carousel to load
        await new Promise((resolve) => {
          const checkCarousel = () => {
            const carousel = document.querySelector(".swiper-wrapper");
            if (carousel) {
              resolve(carousel);
            } else {
              setTimeout(checkCarousel, 500);
            }
          };
          checkCarousel();
          setTimeout(() => resolve(null), 10000); // 10 second timeout
        });

        // Find all time slot elements using the data-testid pattern
        const timeSlotElements = document.querySelectorAll('a[data-testid^="time-slot-"]');
        console.log(`🕐 Found ${timeSlotElements.length} time slot elements`);

        for (const element of timeSlotElements) {
          try {
            const timeText = element.textContent?.trim();
            const testId = element.getAttribute("data-testid");

            // Check if the element is clickable (not disabled)
            const isDisabled =
              element.classList.contains("disabled") ||
              element.getAttribute("aria-disabled") === "true" ||
              element.style.pointerEvents === "none";

            if (!isDisabled && timeText && /\d{1,2}:\d{2}\s*(AM|PM)/i.test(timeText)) {
              slots.push({
                date: selectedDate,
                time: timeText,
                testId: testId || "unknown",
              });
              console.log(`✅ Available slot: ${timeText} on ${selectedDate}`);
            }
          } catch (elementError) {
            console.log(`⚠️ Error processing time slot: ${elementError.message}`);
          }
        }

        // If no data-testid elements found, try broader search
        if (timeSlotElements.length === 0) {
          console.log("🔍 Trying broader search for time elements...");
          const allElements = document.querySelectorAll(
            'a, button, [class*="time"], [class*="slot"], .chip'
          );

          for (const element of allElements) {
            const text = element.textContent?.trim();
            if (text && /\d{1,2}:\d{2}\s*(AM|PM)/i.test(text)) {
              const isDisabled =
                element.classList.contains("disabled") ||
                element.getAttribute("aria-disabled") === "true" ||
                element.style.pointerEvents === "none";

              if (!isDisabled) {
                slots.push({
                  date: selectedDate,
                  time: text,
                  testId: "broad-search",
                });
                console.log(`✅ Available slot (broad search): ${text} on ${selectedDate}`);
              }
            }
          }
        }
      } catch (error) {
        console.log("❌ Error extracting appointment data:", error.message);
      }

      return { slots, selectedDate };
    });

    await browser.close();

    console.log(
      `✅ Found ${appointmentData.slots.length} available slots for ${appointmentData.selectedDate}`
    );

    return {
      serviceName,
      selectedDate: appointmentData.selectedDate,
      slots: appointmentData.slots,
      totalSlots: appointmentData.slots.length,
      bookingUrl: BOOKSY_URL,
      scrapedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Appointment scraping failed:", error);
    return {
      error: "Could not retrieve appointment times",
      serviceName,
      fallback: "Please visit the booking page directly to see available times",
    };
  }
}

/**
 * Debug the actual Booksy page structure to understand what selectors we should use
 */
async function debugBooksyPage(env) {
  try {
    const browser = await launch(env.BROWSER, {
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-first-run",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-features=TranslateUI",
        "--disable-ipc-flooding-protection",
      ],
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1366, height: 768 },
      extraHTTPHeaders: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        DNT: "1",
        Connection: "keep-alive",
        "Cache-Control": "max-age=0",
      },
      timezoneId: "America/New_York",
      locale: "en-US",
      colorScheme: "light",
    });

    const page = await context.newPage();

    await page.addInitScript(() => {
      delete navigator.__proto__.webdriver;
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
      Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 4 });
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    console.log("🔍 Starting Booksy page debugging with stealth mode...");

    // Navigate to Booksy page
    await page.goto(BOOKSY_URL, {
      waitUntil: "domcontentloaded",
      timeout: 10000,
    });

    // Human-like delay
    await page.waitForTimeout(Math.random() * 2000 + 1000);

    console.log("📄 Page loaded, analyzing structure...");

    // Wait a bit for dynamic content to load
    await page.waitForTimeout(3000);

    // Get page info
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        bodyClasses: document.body.className,
        totalElements: document.querySelectorAll("*").length,
      };
    });

    console.log("📊 Page Info:", pageInfo);

    // Find all potential service-related elements
    const serviceAnalysis = await page.evaluate(() => {
      const analysis = {
        potentialServiceContainers: [],
        allClassNames: new Set(),
        allDataAttributes: new Set(),
        headings: [],
        serviceKeywords: [],
      };

      // Collect all elements that might be services
      const allElements = document.querySelectorAll("*");

      allElements.forEach((el) => {
        // Collect class names
        if (el.className && typeof el.className === "string") {
          el.className.split(" ").forEach((cls) => {
            if (cls) analysis.allClassNames.add(cls);
          });
        }

        // Collect data attributes
        Array.from(el.attributes).forEach((attr) => {
          if (attr.name.startsWith("data-")) {
            analysis.allDataAttributes.add(attr.name);
          }
        });

        // Look for service-related text content
        const text = el.textContent?.trim() || "";
        if (text && text.length > 5 && text.length < 100) {
          // Check for service-like keywords
          const serviceWords = [
            "curly",
            "cut",
            "color",
            "treatment",
            "consultation",
            "adventure",
            "$",
            "hour",
            "min",
          ];
          if (serviceWords.some((word) => text.toLowerCase().includes(word))) {
            analysis.serviceKeywords.push({
              text: text,
              tagName: el.tagName,
              className: el.className,
              id: el.id,
            });
          }
        }

        // Collect headings
        if (el.tagName.match(/^H[1-6]$/)) {
          analysis.headings.push({
            level: el.tagName,
            text: el.textContent?.trim(),
            className: el.className,
          });
        }
      });

      // Look specifically for service-like containers
      const serviceSelectors = [
        '[data-testid*="service"]',
        '[class*="service"]',
        '[class*="booking"]',
        '[class*="item"]',
        '[class*="card"]',
        '[class*="list"]',
        "article",
        "section",
        ".menu-item",
        ".treatment",
        ".offer",
      ];

      serviceSelectors.forEach((selector) => {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            analysis.potentialServiceContainers.push({
              selector: selector,
              count: elements.length,
              examples: Array.from(elements)
                .slice(0, 3)
                .map((el) => ({
                  tagName: el.tagName,
                  className: el.className,
                  id: el.id,
                  textPreview: el.textContent?.trim().substring(0, 100),
                  innerHTML: el.innerHTML.substring(0, 200),
                })),
            });
          }
        } catch (e) {
          // Skip invalid selectors
        }
      });

      return {
        ...analysis,
        allClassNames: Array.from(analysis.allClassNames).sort(),
        allDataAttributes: Array.from(analysis.allDataAttributes).sort(),
      };
    });

    console.log("🔍 Service Analysis:", JSON.stringify(serviceAnalysis, null, 2));

    // Try our current selectors to see what they find
    const currentSelectorTest = await page.evaluate(() => {
      const currentSelectors = [
        '[data-testid="service-item"]',
        ".service-card",
        ".booking-service",
        ".service-list",
        '[class*="service"]',
      ];

      const results = {};

      currentSelectors.forEach((selector) => {
        try {
          const elements = document.querySelectorAll(selector);
          results[selector] = {
            count: elements.length,
            examples: Array.from(elements)
              .slice(0, 2)
              .map((el) => ({
                text: el.textContent?.trim().substring(0, 100),
                className: el.className,
                tagName: el.tagName,
              })),
          };
        } catch (e) {
          results[selector] = { error: e.message };
        }
      });

      return results;
    });

    console.log("🧪 Current Selector Test:", JSON.stringify(currentSelectorTest, null, 2));

    await browser.close();

    return {
      pageInfo,
      serviceAnalysis,
      currentSelectorTest,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Debug failed:", error);
    return {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Generate booking link with navigation instructions (fallback)
 */
function getBookingInstructions(serviceName) {
  return {
    url: BOOKSY_URL,
    instructions: [
      `1. Visit Tata's booking page using the link above`,
      `2. Use the "Search for service" box under Tata's name/photo (NOT the main Booksy search at the top)`,
      `3. Type "${serviceName}" to find the service quickly`,
      `4. Click the "Book" button next to that service`,
      `5. Select your preferred date and time from the calendar`,
      `6. Fill out your contact information`,
      `7. Confirm your appointment`,
    ],
    serviceName,
    note: "Important: Use the service search under Tata's section, not the main Booksy search which searches all providers.",
  };
}

/**
 * Enhanced appointment scraping with ultra-resilience
 */
async function scrapeAppointments(env, preferredDate = null) {
  // Check circuit breaker first
  const circuitOpen = await isCircuitBreakerOpen(env);
  if (circuitOpen) {
    console.log("🚫 Circuit breaker OPEN - skipping appointment scraping");
    return {
      available: false,
      message:
        "I can help you find the right service! For current availability, please visit Tata's Booksy page directly. The booking system will show real-time openings.",
      fallbackResponse: true,
    };
  }

  try {
    console.log("📅 Attempting appointment scraping...");
    const browser = await launch(env.BROWSER, {
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-first-run",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-features=TranslateUI",
        "--disable-ipc-flooding-protection",
      ],
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1366, height: 768 },
      extraHTTPHeaders: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        DNT: "1",
        Connection: "keep-alive",
        "Cache-Control": "max-age=0",
      },
      timezoneId: "America/New_York",
      locale: "en-US",
      colorScheme: "light",
    });

    const page = await context.newPage();

    await page.addInitScript(() => {
      delete navigator.__proto__.webdriver;
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
      Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 4 });
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    console.log("🎭 Quick appointment scraping with stealth mode...");

    // Navigate with stealth
    await page.goto(BOOKSY_URL, {
      waitUntil: "domcontentloaded",
      timeout: 8000, // Slightly more time with stealth
    });

    // Human-like delay
    await page.waitForTimeout(Math.random() * 1500 + 500);

    // Try to navigate to booking flow with short timeout
    await Promise.race([
      page.click('button:has-text("Book"), [data-cy*="book"], [class*="book"]'),
      page.waitForTimeout(3000), // Max 3 seconds to find booking button
    ]);

    // Wait longer for the booking interface to fully load (4x local timing)
    console.log("⏳ Waiting for booking interface to stabilize (production timing)...");
    await page.waitForTimeout(20000); // 20 seconds (4x the 5 seconds local)

    // Try to wait for the booking iframe with multiple attempts (longer timeouts)
    let iframeFound = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`🔍 Attempt ${attempt}: Looking for booking iframe (production timing)...`);

      try {
        await page.waitForSelector('iframe[data-testid="booking-widget"]', { timeout: 12000 }); // 12 seconds (4x the 3 seconds local)
        iframeFound = true;
        console.log(`✅ Iframe found on attempt ${attempt}`);
        break;
      } catch (e) {
        console.log(`⚠️ Attempt ${attempt} failed, trying again...`);
        await page.waitForTimeout(8000); // Wait 8 seconds between attempts (4x the 2 seconds local)
      }
    }

    if (!iframeFound) {
      console.log(
        "❌ Iframe not found after 3 attempts with production timing, checking for any iframe..."
      );
    }

    console.log("📅 Booking iframe detected, extracting time slots...");

    // Extract appointments from within the iframe
    const appointments = await Promise.race([
      page.evaluate(async () => {
        console.log("🔍 Looking for booking iframe and time slots...");

        // Find the booking iframe - try specific selector first, then any iframe
        let iframe = document.querySelector('iframe[data-testid="booking-widget"]');

        if (!iframe) {
          console.log("⚠️ Specific booking iframe not found, trying any iframe...");
          const allIframes = document.querySelectorAll("iframe");
          console.log(`🔍 Found ${allIframes.length} total iframes`);

          for (let i = 0; i < allIframes.length; i++) {
            const testIframe = allIframes[i];
            const src = testIframe.getAttribute("src");
            console.log(`📱 Iframe ${i}: src="${src}"`);

            if (
              src &&
              (src.includes("widget") ||
                src.includes("booking") ||
                src.includes("booksy.com/widget"))
            ) {
              console.log(`🎯 Using iframe with booking-related src: ${src}`);
              iframe = testIframe;
              break;
            }
          }

          if (!iframe && allIframes.length > 0) {
            console.log("🔄 Using first available iframe as fallback");
            iframe = allIframes[0];
          }
        }

        if (!iframe) {
          console.log("❌ No iframe found at all");
          return { available: false, times: [], error: "No iframe found" };
        }

        console.log("✅ Found booking iframe, waiting for it to load (production timing)...");

        // Wait a moment for iframe to load (4x local timing)
        await new Promise((resolve) => setTimeout(resolve, 12000)); // 12 seconds (4x the 3 seconds local)

        try {
          // Access iframe content
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          if (!iframeDoc) {
            console.log("❌ Cannot access iframe content");
            return { available: false, times: [], error: "Cannot access iframe content" };
          }

          console.log("✅ Accessing iframe content...");

          // First, detect the selected date from calendar swiper
          let selectedDate = "Unknown Date";
          try {
            console.log("📅 Detecting selected date from calendar...");

            // Find the swiper slide with data-selected="true" and class="active"
            const selectedSlide = iframeDoc.querySelector(
              '.swiper-slide[data-selected="true"].active, .swiper-slide.swiper-slide-active[data-selected="true"]'
            );

            if (selectedSlide) {
              const dateAttr = selectedSlide.getAttribute("data-date");
              const monthAttr = selectedSlide.getAttribute("data-month");
              const yearAttr = selectedSlide.getAttribute("data-year");

              if (dateAttr && monthAttr && yearAttr) {
                // Extract day from the data-date attribute directly (YYYY-MM-DD format)
                const dayNumber = dateAttr.split("-")[2];

                // Extract day of week directly from the HTML content
                let dayOfWeek = "Unknown";
                try {
                  const dayElement = selectedSlide.querySelector(".text-h5");
                  if (dayElement) {
                    const dayText = dayElement.textContent.trim();
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
                  console.log(`⚠️ Could not extract day of week from HTML: ${e.message}`);
                  // Fallback to Date parsing with timezone awareness
                  const dateObj = new Date(dateAttr + "T12:00:00");
                  dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "long" });
                }

                selectedDate = `${dayOfWeek}, ${monthAttr} ${dayNumber}`;
                console.log(`✅ Found selected date: ${selectedDate} (${dateAttr})`);
              }
            } else {
              console.log("⚠️ No selected calendar slide found");
              selectedDate = "Date not detected - please verify in booking interface";
            }
          } catch (dateError) {
            console.log(`⚠️ Date detection failed: ${dateError.message}`);
            selectedDate = "Date detection failed - please verify in booking interface";
          }

          // Look for time slots within the iframe using proven selectors from local test
          const timeSlotSelectors = [
            'a[data-testid^="time-slot-"]', // Proven working selector from local test
            '[data-testid*="time-slot"]',
            'button[data-testid*="time-slot"]',
            ".swiper-slide a", // Time slots are in swiper carousel
            ".swiper-wrapper a", // Alternative swiper path
            '[class*="time"]',
            'button[class*="time"]',
          ];

          const times = [];
          const timeRegex = /\b\d{1,2}:\d{2}\s*(AM|PM)\b/i;

          // Try each selector in the iframe
          for (const selector of timeSlotSelectors) {
            try {
              const elements = iframeDoc.querySelectorAll(selector);
              console.log(`Debug: Found ${elements.length} elements with selector: ${selector}`);

              for (const element of elements) {
                const timeText = element.textContent?.trim();
                if (timeText && timeRegex.test(timeText) && !times.includes(timeText)) {
                  console.log(`✅ Found time slot: ${timeText}`);
                  times.push(timeText);
                }
              }

              // If we found time slots with this selector, we're done
              if (times.length > 0) {
                console.log(`🎯 Success with selector: ${selector}`);
                break;
              }
            } catch (e) {
              console.log(`Selector failed in iframe: ${selector}`, e.message);
            }
          }

          // Also scan all text in iframe for time patterns as backup
          if (times.length === 0) {
            const iframeText = iframeDoc.body?.textContent || "";
            const allTimeMatches = iframeText.match(/\b\d{1,2}:\d{2}\s*(AM|PM)\b/gi) || [];

            allTimeMatches.forEach((match) => {
              if (!times.includes(match) && times.length < 20) {
                times.push(match);
              }
            });
          }

          console.log(`🎯 Total time slots found: ${times.length}`);

          return {
            available: times.length > 0,
            times: times.slice(0, 15), // Allow more time slots like local test
            selectedDate: selectedDate,
            date: new Date().toLocaleDateString(), // Keep for compatibility
            iframeAccess: true,
            source: "iframe_extraction",
          };
        } catch (iframeError) {
          console.log("❌ Error accessing iframe:", iframeError.message);
          return {
            available: false,
            times: [],
            error: `Iframe access error: ${iframeError.message}`,
          };
        }
      }),
      // 40 second timeout for iframe evaluation (4x local timing)
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Iframe extraction timeout")), 40000)
      ),
    ]);

    await browser.close();

    if (appointments.available && appointments.times.length > 0) {
      console.log(`✅ Found ${appointments.times.length} appointment slots`);
      return appointments;
    } else {
      console.log("⚠️ No appointments found - using fallback");
      await recordScrapingFailure(env);
      return getAppointmentFallback();
    }
  } catch (error) {
    console.error("🚨 Appointment scraping failed:", error);
    await recordScrapingFailure(env);
    return getAppointmentFallback();
  }
}

/**
 * Fallback response for appointment failures
 */
function getAppointmentFallback() {
  return {
    available: false,
    message:
      "I can help you find the perfect service! For current availability and booking, please visit Tata's Booksy page. The live calendar will show all available time slots.",
    bookingTip:
      "Look for the 'Search for service' box under Tata's name/photo to find your specific service, then click 'Book' to see available times.",
    fallbackResponse: true,
  };
}

/**
 * Debug the appointment booking flow to see what elements we can find
 */
async function debugAppointmentFlow(env, serviceName) {
  try {
    const browser = await launch(env.BROWSER, {
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-first-run",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-features=TranslateUI",
        "--disable-ipc-flooding-protection",
      ],
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1366, height: 768 },
      extraHTTPHeaders: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        DNT: "1",
        Connection: "keep-alive",
        "Cache-Control": "max-age=0",
      },
      timezoneId: "America/New_York",
      locale: "en-US",
      colorScheme: "light",
    });

    const page = await context.newPage();

    // Add stealth script
    await page.addInitScript(() => {
      delete navigator.__proto__.webdriver;
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
      Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 4 });
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    console.log(`🔍 Debugging appointment flow for: ${serviceName}`);

    // Navigate to Booksy page
    await page.goto(BOOKSY_URL, {
      waitUntil: "domcontentloaded",
      timeout: BROWSER_TIMEOUT,
    });

    // Wait a moment for page to load
    await page.waitForTimeout(3000);

    // Step 1: Analyze the initial page
    const initialState = await page.evaluate(() => {
      const buttons = document.querySelectorAll("button, a, [role='button']");
      const bookingButtons = [];

      buttons.forEach((btn) => {
        const text = btn.textContent?.toLowerCase() || "";
        if (text.includes("book") || text.includes("schedule") || text.includes("appointment")) {
          bookingButtons.push({
            text: btn.textContent.trim(),
            tagName: btn.tagName,
            className: btn.className,
            id: btn.id,
          });
        }
      });

      return {
        totalButtons: buttons.length,
        bookingButtons: bookingButtons,
        pageTitle: document.title,
        url: window.location.href,
        bodyText: document.body.textContent.substring(0, 500),
      };
    });

    // Step 2: Find and click the specific service Book button
    const serviceClickResult = await page.evaluate((targetService) => {
      console.log(`🔍 Looking for service: ${targetService}`);

      // Strategy: Find service name, then find its associated Book button
      const allElements = document.querySelectorAll("h4, div, li, button");
      const serviceBookPairs = [];

      console.log(`Scanning ${allElements.length} elements for service-book pairs`);

      // First pass: collect all potential service matches with scores
      const serviceMatches = [];

      for (let i = 0; i < allElements.length; i++) {
        const element = allElements[i];
        const text = element.textContent?.trim() || "";

        if (text.length > 10 && text.length < 200) {
          // Smart service matching with priority scoring (same as main function)
          function getMatchScore(text, targetService) {
            const textLower = text.toLowerCase();
            const targetLower = targetService.toLowerCase();

            // Exact match gets highest score
            if (textLower === targetLower) return 100;

            // Exact match of service name with parenthetical details
            if (textLower.includes(targetLower)) return 90;

            // Check for specific service variants
            if (targetLower.includes("regular client") && textLower.includes("regular client"))
              return 85;
            if (targetLower.includes("first time") && textLower.includes("first time")) return 85;
            if (targetLower.includes("cliente nuevo") && textLower.includes("cliente nuevo"))
              return 85;

            // Partial match for main service name
            if (targetLower.includes("curly adventure") && textLower.includes("curly adventure")) {
              // Prefer Regular over First Time when asking for Regular
              if (targetLower.includes("regular") && textLower.includes("regular")) return 80;
              if (targetLower.includes("regular") && textLower.includes("first")) return 40; // Low score
              return 70; // Generic curly adventure match
            }

            if (targetLower.includes("consultation") && textLower.includes("consultation"))
              return 75;

            // Basic partial match
            if (textLower.includes(targetLower) || targetLower.includes(textLower)) return 50;

            return 0; // No match
          }

          const matchScore = getMatchScore(text, targetService);

          if (matchScore > 0) {
            serviceMatches.push({
              element,
              text,
              score: matchScore,
              index: i,
            });
          }
        }
      }

      // Sort by score (highest first) and try to click the best match
      serviceMatches.sort((a, b) => b.score - a.score);

      console.log(
        `Debug: Found ${serviceMatches.length} service matches:`,
        serviceMatches.slice(0, 3).map((m) => ({ text: m.text.substring(0, 50), score: m.score }))
      );

      for (const match of serviceMatches) {
        console.log(
          `Debug: ✅ Trying service match (score ${match.score}): ${match.text.substring(0, 50)}`
        );

        // Strategy 1: Look in siblings after this element
        for (let j = match.index + 1; j < Math.min(match.index + 10, allElements.length); j++) {
          const nextElement = allElements[j];
          const nextText = nextElement.textContent?.trim() || "";

          if (nextText.includes("Book") && (nextText.includes("$") || nextText.includes("min"))) {
            console.log(`Debug: 🎯 Found Book button after service: ${nextText.substring(0, 50)}`);
            try {
              nextElement.click();
              return {
                success: true,
                clicked: nextText.substring(0, 100),
                serviceName: match.text,
                strategy: "sibling",
                score: match.score,
              };
            } catch (e) {
              console.log(`Debug: Failed to click: ${e.message}`);
              continue;
            }
          }
        }

        // Strategy 2: Look in parent container
        let parent = match.element.parentElement;
        for (let level = 0; level < 3 && parent; level++) {
          const bookButtons = parent.querySelectorAll("div, button");
          for (const btn of bookButtons) {
            const btnText = btn.textContent?.trim() || "";
            if (btnText.includes("Book") && btnText !== match.text) {
              console.log(`Debug: 🎯 Found Book button in parent: ${btnText.substring(0, 50)}`);
              try {
                btn.click();
                return {
                  success: true,
                  clicked: btnText.substring(0, 100),
                  serviceName: match.text,
                  strategy: "parent",
                  score: match.score,
                };
              } catch (e) {
                console.log(`Debug: Failed to click parent book: ${e.message}`);
                continue;
              }
            }
          }
          parent = parent.parentElement;
        }

        serviceBookPairs.push({
          service: match.text,
          position: match.index,
          element: match.element.tagName,
          score: match.score,
        });
      }

      // Strategy 3: Fallback - look for any prominent Book button
      console.log(`⚠️ Fallback: looking for any prominent Book button`);
      const allBookButtons = document.querySelectorAll("button, div, a");

      for (const btn of allBookButtons) {
        const btnText = btn.textContent?.trim() || "";

        if (
          btnText === "Book" ||
          (btnText.includes("Book") && btnText.includes("$") && btnText.length < 100)
        ) {
          console.log(`📍 Trying fallback Book button: ${btnText.substring(0, 50)}`);
          try {
            btn.click();
            return {
              success: true,
              clicked: btnText.substring(0, 100),
              strategy: "fallback",
            };
          } catch (e) {
            continue;
          }
        }
      }

      return {
        success: false,
        message: "No Book button found",
        serviceBookPairs: serviceBookPairs,
        totalElements: allElements.length,
      };
    }, serviceName);

    // Step 3: Wait a moment and check what happened
    await page.waitForTimeout(2000);

    // Step 4: Comprehensive time slot and booking interface detection
    const calendarState = await page.evaluate(() => {
      console.log("🕐 Debug: Comprehensive time slot search...");

      // Comprehensive time slot detection strategies (same as main function)
      const timeSelectors = [
        // Standard time selectors
        'button[class*="time"]',
        '[data-testid*="time"]',
        '[data-cy*="time"]',
        ".time-slot",
        '[class*="slot"]',
        // Booking-specific selectors
        '[data-testid*="booking"] button',
        '[data-testid*="calendar"] button',
        '[class*="booking"] button',
        '[class*="calendar"] button',
        '[class*="appointment"] button',
        '[class*="modal"] button',
        // Booksy-specific selectors
        'button[class*="purify"]',
        'div[class*="purify"]',
        'li[class*="purify"]',
        // Generic clickable elements
        "button",
        'div[role="button"]',
        'a[role="button"]',
      ];

      const allElements = [];
      const selectorResults = {};

      timeSelectors.forEach((selector) => {
        try {
          const elements = document.querySelectorAll(selector);
          selectorResults[selector] = elements.length;
          allElements.push(...elements);
        } catch (e) {
          selectorResults[selector] = 0;
        }
      });

      console.log(`Debug: Found ${allElements.length} total clickable elements`);

      const times = [];
      const timeRegex = /\b\d{1,2}:\d{2}\s*(AM|PM)\b|\b\d{1,2}\s*(AM|PM)\b/i;

      // Strategy 1: Look for elements with time text
      for (let i = 0; i < Math.min(allElements.length, 50); i++) {
        const element = allElements[i];
        const timeText = element.textContent?.trim();

        if (timeText && timeRegex.test(timeText) && timeText.length < 50) {
          console.log(`Debug: ✅ Found time element: ${timeText}`);
          if (!times.includes(timeText)) {
            times.push(timeText);
          }
        }
      }

      // Strategy 2: Look for buttons that might be time slots
      const potentialTimeButtons = [];
      for (const element of allElements) {
        const text = element.textContent?.trim() || "";
        const isButton = element.tagName === "BUTTON" || element.getAttribute("role") === "button";

        if (
          isButton &&
          text.length > 1 &&
          text.length < 20 &&
          (text.match(/\d/) || text.includes("AM") || text.includes("PM"))
        ) {
          potentialTimeButtons.push(text);
        }
      }

      console.log(`Debug: Found ${potentialTimeButtons.length} potential time buttons`);

      // Strategy 3: Scan entire page text for time patterns
      const allText = document.body.textContent || "";
      const timeMatches = allText.match(/\b\d{1,2}:\d{2}\s*(AM|PM)\b/gi) || [];

      if (timeMatches.length > 0) {
        console.log(`Debug: Found ${timeMatches.length} time patterns in page text`);
        timeMatches.forEach((match) => {
          if (!times.includes(match) && times.length < 15) {
            times.push(match);
          }
        });
      }

      // 🎯 Strategy 4: Look for REAL Booksy booking interface indicators (breakthrough discoveries!)
      const bookingIndicators = {
        // 🗓️ Real Booksy calendar detection
        hasBooksyCalendar: document.querySelectorAll(".b-datepicker").length > 0,
        booksyCalendarElements: document.querySelectorAll(".b-datepicker").length,
        booksyDayRows: document.querySelectorAll(".b-datepicker-days-row").length,
        booksyAvailableDays: document.querySelectorAll(
          ".b-datepicker-day:not(.b-datepicker-day-disabled)"
        ).length,

        // 🕐 Time period detection (Morning/Afternoon/Evening from your screenshot)
        hasTimePeriods: ["Morning", "Afternoon", "Evening"].some((period) =>
          document.body.textContent.includes(period)
        ),

        // 📅 Generic calendar/booking detection (backup)
        hasCalendar:
          document.querySelectorAll('[class*="calendar"], [data-testid*="calendar"]').length > 0,
        hasBooking:
          document.querySelectorAll('[class*="booking"], [data-testid*="booking"]').length > 0,
        hasModal:
          document.querySelectorAll('[class*="modal"], [role="modal"], [role="dialog"]').length > 0,
        hasTimeSelector:
          document.querySelectorAll('[class*="time"], [data-testid*="time"]').length > 0,

        // 🔘 Continue button detection (from your screenshot)
        hasContinueButton: Array.from(document.querySelectorAll("button")).some(
          (btn) => btn.textContent?.trim() === "Continue"
        ),

        // 📦 Booksy-specific elements
        hasPurifyElements: document.querySelectorAll('[class*="purify"]').length > 0,

        // 🎯 NEW: Iframe detection (breakthrough!)
        hasBookingModal:
          document.querySelectorAll("body > div.modal.-lighter-bg.-widget.-booking-widget.-clean")
            .length > 0,
        hasBookingIframe:
          document.querySelectorAll('iframe[data-testid="booking-widget"]').length > 0,
      };

      // 🚀 Strategy 5: NEW Iframe detection and time slot extraction
      let iframeTimeSlots = [];
      let iframeError = null;

      if (bookingIndicators.hasBookingModal && bookingIndicators.hasBookingIframe) {
        console.log("🎯 BREAKTHROUGH: Found booking modal with iframe!");

        try {
          const modal = document.querySelector(
            "body > div.modal.-lighter-bg.-widget.-booking-widget.-clean"
          );
          const iframe = modal?.querySelector('iframe[data-testid="booking-widget"]');

          if (iframe) {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (iframeDoc) {
              console.log("✅ Successfully accessing iframe content!");

              // Look for time slots in iframe
              const iframeTimeSlotSelectors = [
                '[data-testid*="time-slot"]',
                'button[data-testid*="time-slot"]',
                ".swiper-slide button",
                'button:contains("AM")',
                'button:contains("PM")',
                '[class*="time"]',
              ];

              for (const selector of iframeTimeSlotSelectors) {
                try {
                  const elements = iframeDoc.querySelectorAll(selector);
                  console.log(`Iframe selector ${selector}: ${elements.length} elements`);

                  for (const element of elements) {
                    const timeText = element.textContent?.trim();
                    const timeRegex = /\b\d{1,2}:\d{2}\s*(AM|PM)\b/i;
                    if (
                      timeText &&
                      timeRegex.test(timeText) &&
                      !iframeTimeSlots.includes(timeText)
                    ) {
                      iframeTimeSlots.push(timeText);
                      console.log(`✅ Iframe time slot: ${timeText}`);
                    }
                  }
                } catch (e) {
                  console.log(`Iframe selector failed: ${selector}`, e.message);
                }
              }

              // Also scan iframe text for time patterns
              const iframeText = iframeDoc.body?.textContent || "";
              const iframeTimeMatches = iframeText.match(/\b\d{1,2}:\d{2}\s*(AM|PM)\b/gi) || [];
              iframeTimeMatches.forEach((match) => {
                if (!iframeTimeSlots.includes(match) && iframeTimeSlots.length < 20) {
                  iframeTimeSlots.push(match);
                }
              });
            } else {
              iframeError = "Cannot access iframe content (cross-origin restriction)";
            }
          }
        } catch (e) {
          iframeError = `Iframe access error: ${e.message}`;
        }
      }

      return {
        available:
          times.length > 0 || bookingIndicators.hasBooksyCalendar || iframeTimeSlots.length > 0,
        times: times.slice(0, 15),

        // 🎉 Enhanced availability detection (breakthrough update!)
        booksyCalendarDetected: bookingIndicators.hasBooksyCalendar,
        availableDays: bookingIndicators.booksyAvailableDays,
        hasTimePeriods: bookingIndicators.hasTimePeriods,
        hasContinueButton: bookingIndicators.hasContinueButton,

        // 🚀 NEW: Iframe breakthrough results
        iframeDetected: bookingIndicators.hasBookingModal && bookingIndicators.hasBookingIframe,
        iframeTimeSlots: iframeTimeSlots,
        iframeError: iframeError,

        // 📊 Debug info
        selectorResults: selectorResults,
        potentialTimeButtons: potentialTimeButtons.slice(0, 10),
        bookingIndicators: bookingIndicators,
        timeMatchCount: timeMatches.length,
        totalElements: allElements.length,
        currentUrl: window.location.href,
        currentTitle: document.title,
        breakthrough: true, // Flag that we're using the new detection!

        // 💡 Helpful interpretation
        interpretation:
          iframeTimeSlots.length > 0
            ? `BREAKTHROUGH! Found ${iframeTimeSlots.length} time slots in booking iframe!`
            : bookingIndicators.hasBooksyCalendar
            ? "Booksy calendar interface detected! Calendar is loaded and ready for booking."
            : times.length > 0
            ? `Found ${times.length} time slots available for booking.`
            : "No time slots detected. May need to select a date first or booking interface isn't fully loaded.",
      };
    });

    await browser.close();

    return {
      serviceName: serviceName,
      timestamp: new Date().toISOString(),
      steps: {
        initialState: initialState,
        serviceClickResult: serviceClickResult,
        calendarState: calendarState,
      },
    };
  } catch (error) {
    return {
      error: "Debug failed",
      message: error.message,
      serviceName: serviceName,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Main request handler with enhanced error boundaries
 */
export default {
  async fetch(request, env) {
    try {
      // Add timeout wrapper for entire request
      return await Promise.race([
        handleRequest(request, env),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout after 25 seconds")), 25000)
        ),
      ]);
    } catch (error) {
      console.error("🚨 Request handler failed:", error);

      // Always return something useful
      return new Response(
        JSON.stringify({
          error: "Service temporarily unavailable",
          fallback: {
            services: getFallbackServices(),
            message:
              "Using backup service data. For live booking, please visit Tata's Booksy page directly.",
            circuitBreaker: await isCircuitBreakerOpen(env),
          },
        }),
        {
          status: 200, // Return 200 so the system keeps working
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
};

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Enable CORS for all requests
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (path === "/booksy/services") {
      // Get all services (strongly prefer cache to avoid slow scraping)
      let cached = await getCachedServices(env);
      let services;
      let source = "cache";

      if (cached && Date.now() - new Date(cached.lastUpdated).getTime() < CACHE_TTL * 1000) {
        // Use cached data if within TTL
        services = cached.services;
      } else if (cached && cached.services.length > 0) {
        // Use stale cached data if available to avoid hanging
        services = cached.services;
        source = "stale_cache";

        // Trigger background refresh for next time (don't wait)
        ctx.waitUntil(scrapeBooksyServices(env));
      } else {
        // Only scrape if no cache exists at all
        services = await scrapeBooksyServices(env);
        source = "live_scrape";
      }

      return new Response(
        JSON.stringify({
          services,
          totalCount: services.length,
          lastUpdated: cached ? cached.lastUpdated : new Date().toISOString(),
          source: source,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (path === "/booksy/services/search") {
      const query = url.searchParams.get("q");
      const cached = await getCachedServices(env);
      const allServices = cached ? cached.services : getFallbackServices();
      const results = searchServices(allServices, query);

      return new Response(
        JSON.stringify({
          query,
          services: results,
          totalCount: results.length,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (path === "/booksy/services/recommendations") {
      const clientType = url.searchParams.get("type") || "new";
      const cached = await getCachedServices(env);
      const allServices = cached ? cached.services : getFallbackServices();
      const recommendations = getServiceRecommendations(clientType);

      return new Response(
        JSON.stringify({
          clientType,
          services: recommendations,
          totalCount: recommendations.primary.length + recommendations.secondary.length,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (path === "/booksy/booking") {
      const serviceName = url.searchParams.get("service");
      if (!serviceName) {
        return new Response(
          JSON.stringify({
            error: "Service name required. Use ?service=ServiceName",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const bookingInfo = getBookingInstructions(serviceName);

      return new Response(JSON.stringify(bookingInfo), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/booksy/appointments") {
      const serviceName = url.searchParams.get("service");
      // Ignore any incoming dates parameter; always use today + next 6 days
      const preferredDates = getNextNDates(7); // today + next 6 days

      if (!serviceName) {
        return new Response(
          JSON.stringify({
            error:
              "Service name required. Use ?service=ServiceName&dates=YYYY-MM-DD,YYYY-MM-DD (optional)",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Try to get actual appointment times using Playwright
      const appointmentData = await getAvailableAppointments(env, serviceName, preferredDates);

      return new Response(JSON.stringify(appointmentData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/booksy/refresh") {
      // Force refresh of service data
      const services = await scrapeBooksyServices(env);

      return new Response(
        JSON.stringify({
          message: "Services refreshed successfully",
          services,
          totalCount: services.length,
          refreshedAt: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (path === "/booksy/debug") {
      const debugInfo = await debugBooksyPage(env);
      return new Response(JSON.stringify(debugInfo), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/booksy/debug-appointments") {
      const serviceName = url.searchParams.get("service") || "Consultation";
      const debugInfo = await debugAppointmentFlow(env, serviceName);
      return new Response(JSON.stringify(debugInfo), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/appointments") {
      // Re-enabled with upgraded browser capacity!
      const serviceName = url.searchParams.get("service");
      // Ignore any incoming dates parameter; always use today + next 6 days
      const preferredDates = getNextNDates(7); // today + next 6 days

      if (!serviceName) {
        return new Response(
          JSON.stringify({
            error: "Service name required",
            example: "/appointments?service=Curly%20Adventure%20(First%20Time)",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      try {
        const appointments = await scrapeAppointments(env, preferredDates);
        return new Response(JSON.stringify(appointments), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Appointments endpoint error:", error);
        return new Response(JSON.stringify(getAppointmentFallback()), {
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return new Response(
      JSON.stringify({
        error: "Not Found",
        availableEndpoints: [
          "/booksy/services - Get all services",
          "/booksy/services/search?q=query - Search services",
          "/booksy/services/recommendations?type=new|returning - Get recommendations",
          "/booksy/booking?service=ServiceName - Get booking instructions",
          "/booksy/appointments?service=ServiceName - Get available appointment times (NEW!)",
          "/booksy/refresh - Force refresh service data",
          "/booksy/debug - Get debug information about the Booksy page",
        ],
      }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Booksy MCP error:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error.message,
        fallback: "Using cached or fallback service data",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Enhanced function calling with retry logic and user communication
 */
async function executeBooksyFunctionWithRetry(functionName, args, env) {
  try {
    console.log(`🔧 Executing ${functionName}`);
    const circuitOpen = await isCircuitBreakerOpen(env);
    if (circuitOpen) {
      console.log("🚫 Circuit breaker OPEN - skipping browser scraping");
      if (functionName === "get_booksy_services") {
        const cached = await getCachedServices(env);
        if (cached && cached.services.length > 4) {
          return {
            ...cached,
            circuitBreakerActive: true,
            message: "Using recent data - live scraping temporarily unavailable",
          };
        }
      }
      return getFallbackServices();
    }
    const baseUrl = env.BOOKSY_MCP_URL || "https://booksy-dynamic.tataorowhatsappgpt.workers.dev";
    const endpointMap = {
      get_booksy_services: "/services",
      search_booksy_services: `/search?q=${encodeURIComponent(args.query || "")}`,
      get_service_recommendations: `/recommendations?clientType=${args.clientType || "unknown"}`,
      get_booking_instructions: `/booking?service=${encodeURIComponent(args.serviceName || "")}`,
      get_available_appointments: `/appointments?service=${encodeURIComponent(
        args.serviceName || ""
      )}${args.preferredDates ? `&dates=${args.preferredDates.join(",")}` : ""}`,
    };
    const endpoint = endpointMap[functionName];
    if (!endpoint) {
      return { error: `Unknown function: ${functionName}` };
    }
    const url = `${baseUrl}${endpoint}`;
    const timeoutMs = 12000;
    const response = await Promise.race([
      fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": `TataOro-WhatsApp-GPT/1.9.0-no-retry`,
        },
      }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Function call timeout after ${timeoutMs / 1000} seconds`)),
          timeoutMs
        )
      ),
    ]);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const result = await Promise.race([
      response.json(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("JSON parsing timeout")), 3000)),
    ]);
    return result;
  } catch (error) {
    await recordScrapingFailure(env);
    return {
      error: `Sorry, I couldn't get the latest info right now. Please try again in a couple minutes or visit Tata's Booksy page to check availability directly.`,
      details: error.message,
      fallback: true,
    };
  }
}
