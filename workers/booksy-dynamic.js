/**
 * Dynamic Booksy MCP Server - Scrapes live service data from Booksy
 *
 * Provides real-time service information instead of hardcoded static data.
 * Uses Playwright to scrape the actual Booksy booking page.
 */

import { launch } from "@cloudflare/playwright";

const BOOKSY_URL =
  "https://booksy.com/en-us/155582_akro-beauty-by-la-morocha-makeup_hair-salon_134763_orlando/staffer/880999";
const CACHE_TTL = 86400; // 24 hour cache - ultra aggressive to minimize browser usage
const CIRCUIT_BREAKER_TTL = 3600; // 1 hour circuit breaker cooldown
const MAX_FAILURES = 3; // Trip circuit breaker after 3 consecutive failures

// Enhanced timeouts with upgraded browser capacity
const BROWSER_TIMEOUT = 10000; // 10 seconds (up from 8) - more generous with upgraded plan
const SELECTOR_WAIT_TIMEOUT = 8000; // 8 seconds (up from 6) - better success rate
const EVALUATION_TIMEOUT = 12000; // 12 seconds (up from 10) - more thorough scraping

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
    const browser = await launch(env.BROWSER);
    const page = await browser.newPage();

    // 🥷 STEALTH MODE: Make browser look like a real human
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.setViewportSize({ width: 1366, height: 768 }); // Common laptop resolution

    // Set realistic headers
    await page.setExtraHTTPHeaders({
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate, br",
      DNT: "1",
      Connection: "keep-alive",
      "Cache-Control": "max-age=0",
    });

    // Randomize timezone to look more human
    await page.emulateTimezone("America/New_York");

    // 🎭 NINJA MODE: Hide automation detection
    await page.evaluateOnNewDocument(() => {
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
        { expirationTtl: CACHE_TTL }
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
 * Get available appointment times for a specific service using Playwright
 * @param {*} env - Environment variables
 * @param {*} serviceName - Name of the service to book
 * @param {*} preferredDates - Optional array of preferred dates to check
 */
async function getAvailableAppointments(env, serviceName, preferredDates = null) {
  try {
    const browser = await launch(env.BROWSER);
    const page = await browser.newPage();

    // 🥷 STEALTH MODE: Make browser look like a real human
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.setViewportSize({ width: 1366, height: 768 });

    await page.setExtraHTTPHeaders({
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate, br",
      DNT: "1",
      Connection: "keep-alive",
      "Cache-Control": "max-age=0",
    });

    await page.emulateTimezone("America/New_York");

    console.log("🎭 Appointment scraping with stealth mode...");

    // Navigate to Booksy page
    await page.goto(BOOKSY_URL, {
      waitUntil: "domcontentloaded",
      timeout: BROWSER_TIMEOUT,
    });

    // Human-like delay
    await page.waitForTimeout(Math.random() * 2000 + 1000);

    // Find and click the specific service
    console.log(`Looking for service: ${serviceName}`);

    // Wait for services to load
    await page.waitForSelector(
      '[data-testid="service-item"], .service-card, .booking-service, [class*="service"]',
      {
        timeout: SELECTOR_WAIT_TIMEOUT,
      }
    );

    // Try to find the service by name and click its book button
    const serviceClicked = await page.evaluate((targetService) => {
      const serviceElements = document.querySelectorAll(
        '[data-testid="service-item"], .service-card, .booking-service, [class*="service"]'
      );

      for (const element of serviceElements) {
        const nameEl = element.querySelector(
          'h3, .service-name, [class*="title"], [class*="name"]'
        );
        if (nameEl && nameEl.textContent.includes(targetService)) {
          // Find and click the book button for this service
          const bookButton = element.querySelector('button, [class*="book"], [class*="select"], a');
          if (bookButton) {
            bookButton.click();
            return true;
          }
        }
      }
      return false;
    }, serviceName);

    if (!serviceClicked) {
      await browser.close();
      return { error: `Could not find service: ${serviceName}` };
    }

    // Wait for calendar/time selection to load (5+ seconds as you noted)
    console.log("Waiting for calendar to load after clicking book...");
    await page.waitForTimeout(6000); // Wait 6 seconds for calendar to fully load

    // Then wait for calendar elements to be present
    await page.waitForSelector(
      '[data-testid="calendar"], .calendar, [class*="calendar"], [class*="time"], [class*="slot"], [class*="date"]',
      {
        timeout: 10000,
      }
    );

    // Enhanced appointment scraping with upgraded browser capacity
    await page.goto(BOOKSY_URL, {
      waitUntil: "domcontentloaded",
      timeout: BROWSER_TIMEOUT, // More generous timeout
    });

    // Try to navigate to booking flow with enhanced timeout
    await Promise.race([
      page.click('button:has-text("Book"), [data-cy*="book"], [class*="book"]'),
      page.waitForTimeout(5000), // More time to find booking button
    ]);

    // Enhanced wait for calendar with better timeout
    await Promise.race([
      page.waitForSelector('[class*="calendar"], [class*="date"], [data-cy*="calendar"]', {
        timeout: SELECTOR_WAIT_TIMEOUT,
      }),
      page.waitForTimeout(SELECTOR_WAIT_TIMEOUT),
    ]);

    // Enhanced appointment extraction with improved timeout
    const appointments = await Promise.race([
      page.evaluate(() => {
        // Quick time slot detection
        const timeElements = document.querySelectorAll(
          'button[class*="time"], [data-cy*="time"], .time-slot, [class*="slot"], button:contains("AM"), button:contains("PM")'
        );

        const times = [];
        // Process max 15 time slots (increased from 10)
        for (let i = 0; i < Math.min(timeElements.length, 15); i++) {
          const element = timeElements[i];
          const timeText = element.textContent?.trim();
          if (timeText && (timeText.includes("AM") || timeText.includes("PM"))) {
            times.push(timeText);
          }
        }

        return {
          available: times.length > 0,
          times: times.slice(0, 8), // More time slots returned
          date: new Date().toLocaleDateString(),
          quickScrape: true,
          upgraded: true, // Flag to indicate enhanced scraping
        };
      }),
      // Enhanced timeout for evaluation
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Appointment extraction timeout")), EVALUATION_TIMEOUT)
      ),
    ]);

    await browser.close();

    return {
      serviceName,
      availableTimes: appointments,
      totalSlots: appointments.times.length,
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
    const browser = await launch(env.BROWSER);
    const page = await browser.newPage();

    // 🥷 STEALTH MODE: Make browser look like a real human
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.setViewportSize({ width: 1366, height: 768 });

    await page.setExtraHTTPHeaders({
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate, br",
      DNT: "1",
      Connection: "keep-alive",
      "Cache-Control": "max-age=0",
    });

    await page.emulateTimezone("America/New_York");

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
    const browser = await launch(env.BROWSER);
    const page = await browser.newPage();

    // 🥷 STEALTH MODE: Make browser look like a real human
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.setViewportSize({ width: 1366, height: 768 });

    await page.setExtraHTTPHeaders({
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate, br",
      DNT: "1",
      Connection: "keep-alive",
      "Cache-Control": "max-age=0",
    });

    await page.emulateTimezone("America/New_York");

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

    // Very short wait for calendar
    await Promise.race([
      page.waitForSelector('[class*="calendar"], [class*="date"], [data-cy*="calendar"]', {
        timeout: 4000,
      }),
      page.waitForTimeout(4000),
    ]);

    // Quick appointment extraction with timeout
    const appointments = await Promise.race([
      page.evaluate(() => {
        // Quick time slot detection
        const timeElements = document.querySelectorAll(
          'button[class*="time"], [data-cy*="time"], .time-slot, [class*="slot"], button:contains("AM"), button:contains("PM")'
        );

        const times = [];
        // Process max 10 time slots quickly
        for (let i = 0; i < Math.min(timeElements.length, 10); i++) {
          const element = timeElements[i];
          const timeText = element.textContent?.trim();
          if (timeText && (timeText.includes("AM") || timeText.includes("PM"))) {
            times.push(timeText);
          }
        }

        return {
          available: times.length > 0,
          times: times.slice(0, 5), // Max 5 times
          date: new Date().toLocaleDateString(),
          quickScrape: true,
        };
      }),
      // 5 second timeout for evaluation
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Appointment extraction timeout")), 5000)
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
      const preferredDatesParam = url.searchParams.get("dates");

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

      // Parse preferred dates if provided
      const preferredDates = preferredDatesParam
        ? preferredDatesParam.split(",").map((d) => d.trim())
        : null;

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

    if (path === "/appointments") {
      // Re-enabled with upgraded browser capacity!
      const serviceName = url.searchParams.get("service");
      const preferredDates = url.searchParams.get("dates")?.split(",") || null;

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
async function executeBooksyFunctionWithRetry(functionName, args, env, attempt = 1) {
  const maxAttempts = 2; // Allow one retry

  try {
    console.log(`🔧 Executing ${functionName} (attempt ${attempt}/${maxAttempts})`);

    // Check circuit breaker first
    const circuitOpen = await isCircuitBreakerOpen(env);
    if (circuitOpen) {
      console.log("🚫 Circuit breaker OPEN - skipping browser scraping");

      // Try to return cached data even if stale
      if (functionName === "get_booksy_services") {
        const cached = await getCachedServices(env);
        if (cached && cached.services.length > 4) {
          console.log("📦 Using stale cache due to circuit breaker");
          return {
            ...cached,
            circuitBreakerActive: true,
            message: "Using recent data - live scraping temporarily unavailable",
          };
        }
      }

      // Final fallback
      console.log("🔄 Circuit breaker + no cache = fallback services");
      return getFallbackServices();
    }

    const baseUrl = env.BOOKSY_MCP_URL || "https://booksy-dynamic.tataorowhatsappgpt.workers.dev";

    // Route function calls to appropriate endpoints
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
      console.log(`❌ Unknown function: ${functionName}`);
      return { error: `Unknown function: ${functionName}` };
    }

    const url = `${baseUrl}${endpoint}`;
    console.log(`🌐 Calling: ${url} (attempt ${attempt})`);

    // Enhanced timeout with retry-aware messaging
    const timeoutMs = attempt === 1 ? 12000 : 15000; // More time on retry
    const response = await Promise.race([
      fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": `TataOro-WhatsApp-GPT/1.9.0-retry-${attempt}`,
        },
      }),
      new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `Function call timeout after ${timeoutMs / 1000} seconds (attempt ${attempt})`
              )
            ),
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

    console.log(`✅ Function ${functionName} executed successfully on attempt ${attempt}`);

    // Add retry success metadata
    if (attempt > 1) {
      result.retrySuccess = true;
      result.successfulAttempt = attempt;
    }

    return result;
  } catch (error) {
    console.error(`🚨 Function ${functionName} failed on attempt ${attempt}:`, error);

    // If this was our first attempt and we can retry, try again
    if (attempt < maxAttempts) {
      console.log(`🔄 Retrying ${functionName} (attempt ${attempt + 1}/${maxAttempts})`);

      // Don't record this as a circuit breaker failure yet - give retry a chance
      return await executeBooksyFunctionWithRetry(functionName, args, env, attempt + 1);
    }

    // We've exhausted retries - record failure and return fallback
    await recordScrapingFailure(env);
    console.log(`💥 Function ${functionName} failed after ${maxAttempts} attempts`);

    const fallback = getFunctionFallback(functionName, args);
    fallback.retriedAndFailed = true;
    fallback.totalAttempts = maxAttempts;

    return fallback;
  }
}
