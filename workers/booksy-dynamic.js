/**
 * Dynamic Booksy MCP Server - Scrapes live service data from Booksy
 *
 * Provides real-time service information instead of hardcoded static data.
 * Uses Playwright to scrape the actual Booksy booking page.
 */

import { launch } from "@cloudflare/playwright";

const BOOKSY_URL =
  "https://booksy.com/en-us/155582_akro-beauty-by-la-morocha-makeup_hair-salon_134763_orlando/staffer/880999";
const CACHE_TTL = 3600; // 1 hour cache

/**
 * Scrape live services from Booksy page
 */
async function scrapeBooksyServices(env) {
  try {
    const browser = await launch(env.BROWSER);
    const page = await browser.newPage();

    // Navigate to Booksy page
    await page.goto(BOOKSY_URL, { waitUntil: "networkidle" });

    // Wait for services to load
    await page.waitForSelector('[data-testid="service-item"], .service-card, .booking-service', {
      timeout: 10000,
    });

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
 * Generate booking link with navigation instructions
 */
function getBookingInstructions(serviceName) {
  const searchTerm = serviceName.split(" ")[0]; // First word for Ctrl+F search

  return {
    url: BOOKSY_URL,
    instructions: [
      `1. Click the booking link to open Tata's booking page`,
      `2. Use Ctrl+F (Cmd+F on Mac) and search for "${searchTerm}"`,
      `3. Select "${serviceName}" from the services list`,
      `4. Choose your preferred date and time`,
      `5. Fill out the booking form with your details`,
      `6. Confirm your appointment`,
    ],
    searchTerm,
    note: "Booksy uses a single page for all services - the search tip helps you find your specific service quickly!",
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
        // Get all services (try cache first, then scrape if needed)
        let cached = await getCachedServices(env);
        let services;

        if (cached && Date.now() - new Date(cached.lastUpdated).getTime() < CACHE_TTL * 1000) {
          services = cached.services;
        } else {
          services = await scrapeBooksyServices(env);
        }

        return new Response(
          JSON.stringify({
            services,
            totalCount: services.length,
            lastUpdated: cached ? cached.lastUpdated : new Date().toISOString(),
            source: cached ? "cache" : "live_scrape",
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
