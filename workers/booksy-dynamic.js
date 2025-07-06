/**
 * Dynamic Booksy MCP Server - Scrapes live service data from Booksy
 *
 * Provides real-time service information instead of hardcoded static data.
 * Uses Playwright to scrape the actual Booksy booking page.
 */

import { launch } from "@cloudflare/playwright";

const BOOKSY_URL =
  "https://booksy.com/en-us/155582_akro-beauty-by-la-morocha-makeup_hair-salon_134763_orlando/staffer/880999";
const CACHE_TTL = 7200; // 2 hour cache to reduce scraping frequency

/**
 * Scrape live services from Booksy page
 */
async function scrapeBooksyServices(env) {
  try {
    const browser = await launch(env.BROWSER);
    const page = await browser.newPage();

    // Navigate to Booksy page with faster settings
    await page.goto(BOOKSY_URL, {
      waitUntil: "domcontentloaded", // Faster than networkidle
      timeout: 8000,
    });

    // Wait for services to load with shorter timeout
    await page.waitForSelector(
      '[data-testid="service-item"], .service-card, .booking-service, .service-list, [class*="service"]',
      {
        timeout: 5000,
      }
    );

    // Extract service data
    const services = await page.evaluate(() => {
      const serviceElements = document.querySelectorAll(
        '[data-testid="service-item"], .service-card, .booking-service, [class*="service"]'
      );

      const extractedServices = [];

      serviceElements.forEach((element) => {
        const nameEl = element.querySelector(
          'h3, .service-name, [class*="title"], [class*="name"]'
        );
        const priceEl = element.querySelector('.price, [class*="price"], [data-testid="price"]');
        const durationEl = element.querySelector('.duration, [class*="duration"], [class*="time"]');
        const descEl = element.querySelector('.description, [class*="description"], p');

        if (nameEl && nameEl.textContent.trim()) {
          const service = {
            name: nameEl.textContent.trim(),
            price: priceEl ? priceEl.textContent.trim() : "Price varies",
            duration: durationEl ? durationEl.textContent.trim() : "Duration varies",
            description: descEl ? descEl.textContent.trim() : "",
            scrapedAt: new Date().toISOString(),
          };

          // Only add if it looks like a real service (has name and some other info)
          if (
            service.name.length > 3 &&
            (service.price !== "Price varies" || service.duration !== "Duration varies")
          ) {
            extractedServices.push(service);
          }
        }
      });

      return extractedServices;
    });

    await browser.close();

    // Cache the results
    if (services.length > 0) {
      await env.CHAT_HISTORY.put(
        `booksy:services:live`,
        JSON.stringify({
          services,
          lastUpdated: new Date().toISOString(),
          source: "live_scrape",
        }),
        { expirationTtl: CACHE_TTL }
      );
    }

    return services;
  } catch (error) {
    console.error("Booksy scraping failed:", error);

    // Try to return cached data as fallback
    const cached = await getCachedServices(env);
    if (cached) {
      return cached.services;
    }

    // Final fallback - basic service list
    return getFallbackServices();
  }
}

/**
 * Get cached services if available
 */
async function getCachedServices(env) {
  try {
    const cached = await env.CHAT_HISTORY.get(`booksy:services:live`);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error("Cache retrieval failed:", error);
    return null;
  }
}

/**
 * Fallback services when scraping fails
 */
function getFallbackServices() {
  return [
    {
      name: "Free Consultation (Diagnóstico capilar)",
      price: "FREE",
      duration: "30 minutes",
      description: "Free curly hair consultation and diagnosis - perfect for new clients",
      category: "consultation",
    },
    {
      name: "Curly Adventure (First Time)",
      price: "Starting $200",
      duration: "2.5 hours",
      description:
        "Complete curly hair transformation for new clients - includes consultation, cut, and styling",
      category: "curly_service",
    },
    {
      name: "Curly Cut + Simple Definition",
      price: "Starting $150",
      duration: "1.5 hours",
      description:
        "Professional curly haircut with styling and definition - great for regular maintenance",
      category: "curly_service",
    },
    {
      name: "Curly Color Experience",
      price: "Starting $250",
      duration: "2.5 hours",
      description: "Professional color treatment specifically designed for curly hair",
      category: "color",
    },
  ];
}

/**
 * Search services by query
 */
function searchServices(services, query) {
  if (!query || !services) return services;

  const searchTerm = query.toLowerCase();
  return services.filter(
    (service) =>
      service.name.toLowerCase().includes(searchTerm) ||
      service.description.toLowerCase().includes(searchTerm) ||
      (service.category && service.category.includes(searchTerm))
  );
}

/**
 * Get service recommendations based on client needs
 */
function getServiceRecommendations(services, clientType = "new") {
  if (!services) return [];

  if (clientType === "new") {
    return services.filter(
      (service) =>
        service.name.toLowerCase().includes("first time") ||
        service.name.toLowerCase().includes("consultation") ||
        service.name.toLowerCase().includes("new")
    );
  }

  return services.filter(
    (service) =>
      !service.name.toLowerCase().includes("first time") &&
      !service.name.toLowerCase().includes("consultation")
  );
}

/**
 * Get available appointment times for a specific service using Playwright
 */
async function getAvailableAppointments(env, serviceName) {
  try {
    const browser = await launch(env.BROWSER);
    const page = await browser.newPage();

    // Navigate to Booksy page
    await page.goto(BOOKSY_URL, {
      waitUntil: "domcontentloaded",
      timeout: 8000,
    });

    // Find and click the specific service
    console.log(`Looking for service: ${serviceName}`);

    // Wait for services to load
    await page.waitForSelector(
      '[data-testid="service-item"], .service-card, .booking-service, [class*="service"]',
      {
        timeout: 5000,
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

    // Wait for calendar/time selection to load
    await page.waitForSelector(
      '[data-testid="calendar"], .calendar, [class*="calendar"], [class*="time"], [class*="slot"]',
      {
        timeout: 8000,
      }
    );

    // Extract available appointment times
    const availableTimes = await page.evaluate(() => {
      const timeSlots = [];

      // Look for various time slot selectors
      const slotElements = document.querySelectorAll(
        '[data-testid="time-slot"], [class*="time-slot"], [class*="appointment-time"], .time-option, [class*="available"]'
      );

      slotElements.forEach((slot) => {
        const timeText = slot.textContent.trim();
        const dateContext = slot.closest('[data-date], [class*="date"], [class*="day"]');
        const dateText = dateContext
          ? dateContext.getAttribute("data-date") || dateContext.textContent
          : "";

        if (timeText && timeText.match(/\d{1,2}:\d{2}|AM|PM/)) {
          timeSlots.push({
            time: timeText,
            date: dateText,
            available:
              !slot.classList.contains("disabled") && !slot.classList.contains("unavailable"),
          });
        }
      });

      // If no time slots found, look for calendar dates
      if (timeSlots.length === 0) {
        const dateElements = document.querySelectorAll(
          '[class*="available-date"], [class*="calendar-day"]:not([class*="disabled"]), [data-available="true"]'
        );

        dateElements.forEach((dateEl) => {
          const dateText = dateEl.textContent.trim() || dateEl.getAttribute("data-date");
          if (dateText) {
            timeSlots.push({
              date: dateText,
              time: "Times available",
              available: true,
            });
          }
        });
      }

      return timeSlots.slice(0, 10); // Limit to first 10 slots
    });

    await browser.close();

    return {
      serviceName,
      availableTimes,
      totalSlots: availableTimes.length,
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
 * Generate booking link with navigation instructions (fallback)
 */
function getBookingInstructions(serviceName) {
  return {
    url: BOOKSY_URL,
    instructions: [
      `1. Visit Tata's booking page using the link above`,
      `2. Scroll down to find "${serviceName}"`,
      `3. Click the "Book" button next to that service`,
      `4. Select your preferred date and time from the calendar`,
      `5. Fill out your contact information`,
      `6. Confirm your appointment`,
    ],
    serviceName,
    note: "The booking page has multiple search options that can be confusing - scrolling to find your service is more reliable than searching.",
  };
}

/**
 * MCP Server Request Handler
 */
export default {
  async fetch(request, env, ctx) {
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
        const recommendations = getServiceRecommendations(allServices, clientType);

        return new Response(
          JSON.stringify({
            clientType,
            services: recommendations,
            totalCount: recommendations.length,
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

        // Try to get actual appointment times using Playwright
        const appointmentData = await getAvailableAppointments(env, serviceName);

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
  },
};
