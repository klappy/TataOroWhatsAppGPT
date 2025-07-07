/**
 * Booksy Clean Integration - API-First Antifragile Design
 *
 * Simple, reliable, maintainable approach using discovered Booksy API
 * ~300 lines instead of 4,379 lines of complex browser automation
 */

// Booksy API Configuration
const BOOKSY_API_KEY = "web-e3d812bf-d7a2-445d-ab38-55589ae6a121";
const BOOKSY_API_BASE = "https://us.booksy.com/api/us/2/customer_api";
const BUSINESS_ID = 155582;
const BOOKSY_URL =
  "https://booksy.com/en-us/155582_akro-beauty-by-la-morocha-makeup_hair-salon_134763_orlando/staffer/880999";

// Cache settings
const CACHE_TTL = 3600; // 1 hour for business data
const HARD_TIMEOUT = 3000; // 3 seconds max for any operation

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Known services fallback (when everything fails)
const KNOWN_SERVICES = {
  curly_adventure_first: {
    name: "Curly Adventure (First Time)",
    price: "$200",
    duration: "150 minutes",
    staff: "Tatiana Orozco",
    description:
      "Complete curly hair transformation for new clients. Includes consultation, cut, and styling education.",
    category: "new_client",
    id: 7132273,
  },
  curly_adventure_regular: {
    name: "Curly Adventure (Regular Client)",
    price: "$180",
    duration: "120 minutes",
    staff: "Tatiana Orozco",
    description: "Curly cut and style for returning clients who understand their curl pattern.",
    category: "returning_client",
    id: 7132274,
  },
  consultation: {
    name: "Consultation Only",
    price: "$50",
    duration: "45 minutes",
    staff: "Tatiana Orozco",
    description: "In-depth consultation to understand your curl pattern and create a care plan.",
    category: "consultation",
    id: 8322085,
  },
};

/**
 * Main worker entry point
 */
export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Simple routing
      if (path === "/booksy/services") {
        return await getServices(env);
      }

      if (path === "/booksy/appointments") {
        const service = url.searchParams.get("service") || "Curly Adventure";
        return await getAppointments(env, service);
      }

      if (path === "/booksy/business") {
        return await getBusinessInfo(env);
      }

      // Health check
      if (path === "/booksy/health") {
        return new Response(
          JSON.stringify({
            status: "healthy",
            timestamp: new Date().toISOString(),
            version: "clean-api-first",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response("Endpoint not found", {
        status: 404,
        headers: corsHeaders,
      });
    } catch (error) {
      console.error("Worker error:", error);
      return new Response(
        JSON.stringify({
          error: "Service temporarily unavailable",
          message: "Please try again or visit booksy.com directly",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  },
};

/**
 * Get business information via API
 */
async function getBusinessInfo(env) {
  try {
    // Try API first
    const businessData = await getBusinessDataAPI();

    // Cache the result
    await env.CHAT_HISTORY.put("booksy:business", JSON.stringify(businessData), {
      expirationTtl: CACHE_TTL,
    });

    return new Response(
      JSON.stringify({
        name: businessData.business.name,
        address: businessData.business.location?.address,
        phone: businessData.business.phone,
        rating: businessData.business.reviews_stars,
        reviewCount: businessData.business.reviews_count,
        description: businessData.business.description,
        url: BOOKSY_URL,
        reliability: "high",
        source: "api",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Business API failed:", error);

    // Try cached data
    const cached = await getCachedData(env, "booksy:business");
    if (cached) {
      return new Response(
        JSON.stringify({
          ...cached,
          reliability: "medium",
          source: "cache",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Final fallback
    return new Response(
      JSON.stringify({
        name: "Akro Beauty by La Morocha Makeup",
        address: "8865 Commodity Circle, Suite 7A, Orlando, 32819",
        phone: "Contact via Booksy",
        rating: 5,
        description: "Curly hair specialist - Tatiana Orozco",
        url: BOOKSY_URL,
        reliability: "low",
        source: "fallback",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Get services via API with graceful fallbacks
 */
async function getServices(env) {
  try {
    // Try API first (fast, reliable)
    const businessData = await getBusinessDataAPI();
    const services = businessData.business.top_services.map((service) => ({
      name: service.name,
      price: service.variants[0]?.service_price || "Contact for pricing",
      duration: `${service.variants[0]?.duration || "Varies"} minutes`,
      description: service.description || "",
      category: service.category_name || "General",
      staff: "Tatiana Orozco",
      id: service.id,
    }));

    // Cache the result
    await env.CHAT_HISTORY.put("booksy:services", JSON.stringify(services), {
      expirationTtl: CACHE_TTL,
    });

    return new Response(
      JSON.stringify({
        services,
        count: services.length,
        reliability: "high",
        source: "api",
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Services API failed:", error);

    // Try cached data
    const cached = await getCachedData(env, "booksy:services");
    if (cached) {
      return new Response(
        JSON.stringify({
          services: cached,
          count: cached.length,
          reliability: "medium",
          source: "cache",
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Final fallback to known services
    const fallbackServices = Object.values(KNOWN_SERVICES);
    return new Response(
      JSON.stringify({
        services: fallbackServices,
        count: fallbackServices.length,
        reliability: "low",
        source: "fallback",
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Get appointment information for a specific service
 */
async function getAppointments(env, serviceName) {
  try {
    // Get service info via API (instant)
    const businessData = await getBusinessDataAPI();
    const service = findServiceByName(businessData.business.top_services, serviceName);

    if (!service) {
      return new Response(
        JSON.stringify({
          error: "Service not found",
          query: serviceName,
          availableServices: businessData.business.top_services.map((s) => s.name),
          suggestion: "Try one of the available services listed above",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Return comprehensive service information with booking guidance
    return new Response(
      JSON.stringify({
        service: {
          name: service.name,
          price: service.variants[0]?.service_price || "Contact for pricing",
          duration: `${service.variants[0]?.duration || "Varies"} minutes`,
          description: service.description || "",
          category: service.category_name || "General",
          staff: "Tatiana Orozco",
          id: service.id,
        },
        business: {
          name: businessData.business.name,
          address: businessData.business.location?.address,
          phone: businessData.business.phone,
          rating: businessData.business.reviews_stars,
          reviewCount: businessData.business.reviews_count,
        },
        booking: {
          message: "To check real-time availability and book this service:",
          url: BOOKSY_URL,
          phone: businessData.business.phone,
          instructions: [
            "1. Visit the Booksy link above",
            "2. Select your preferred date and time",
            "3. Complete the booking process",
            "4. You will receive confirmation via email/SMS",
          ],
          tips: [
            "Book in advance for better availability",
            "Tuesday-Thursday typically have more openings",
            "Call directly for same-day appointments",
          ],
        },
        reliability: "high",
        extractionMethod: "api-first",
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Appointments API failed:", error);

    // Graceful fallback with known service info
    const knownService = findKnownService(serviceName);
    if (knownService) {
      return new Response(
        JSON.stringify({
          service: knownService,
          business: {
            name: "Akro Beauty by La Morocha Makeup",
            address: "8865 Commodity Circle, Suite 7A, Orlando, 32819",
            phone: "Contact via Booksy",
          },
          booking: {
            message: "Service information available, please book directly:",
            url: BOOKSY_URL,
            instructions: ["Visit booksy.com to check availability and book"],
          },
          reliability: "medium",
          extractionMethod: "fallback",
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: "Service information temporarily unavailable",
        message: "Please visit booksy.com or call directly",
        url: BOOKSY_URL,
        fallback: true,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Fetch business data from Booksy API
 */
async function getBusinessDataAPI() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HARD_TIMEOUT);

  try {
    const response = await fetch(`${BOOKSY_API_BASE}/businesses/${BUSINESS_ID}`, {
      headers: {
        Accept: "application/json",
        "x-api-key": BOOKSY_API_KEY,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Booksy API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Find service by name with fuzzy matching
 */
function findServiceByName(services, serviceName) {
  if (!services || !serviceName) return null;

  const query = serviceName.toLowerCase().trim();

  // Exact match first
  let match = services.find((service) => service.name.toLowerCase() === query);

  if (match) return match;

  // Partial match
  match = services.find(
    (service) =>
      service.name.toLowerCase().includes(query) || query.includes(service.name.toLowerCase())
  );

  if (match) return match;

  // Fuzzy matching for common terms
  if (query.includes("curly")) {
    match = services.find(
      (service) =>
        service.name.toLowerCase().includes("curly") ||
        service.category_name?.toLowerCase().includes("curly")
    );
  }

  if (query.includes("first") || query.includes("new")) {
    match = services.find((service) => service.name.toLowerCase().includes("first time"));
  }

  if (query.includes("consultation")) {
    match = services.find((service) => service.name.toLowerCase().includes("consultation"));
  }

  return match || null;
}

/**
 * Find service in known services fallback
 */
function findKnownService(serviceName) {
  const query = serviceName.toLowerCase();

  for (const service of Object.values(KNOWN_SERVICES)) {
    if (service.name.toLowerCase().includes(query) || query.includes(service.name.toLowerCase())) {
      return service;
    }
  }

  // Default to curly adventure for curly-related queries
  if (query.includes("curly")) {
    return KNOWN_SERVICES.curly_adventure_first;
  }

  return null;
}

/**
 * Get cached data with error handling
 */
async function getCachedData(env, key) {
  try {
    const cached = await env.CHAT_HISTORY.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error(`Cache retrieval failed for ${key}:`, error);
    return null;
  }
}
