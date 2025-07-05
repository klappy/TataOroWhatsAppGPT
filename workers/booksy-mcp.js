/**
 * Booksy Service Discovery for Tata Oro
 *
 * Provides service discovery and booking assistance for Tata Oro's Booksy integration
 * Since Booksy doesn't provide a public API, this uses a service catalog approach
 * with direct booking links to Tata's specific Booksy page.
 */

// Tata's Booksy configuration
const TATA_BOOKSY_CONFIG = {
  businessId: "155582",
  stafferId: "880999",
  businessName: "Akro Beauty by La Morocha Makeup",
  stafferName: "Tatiana Orozco",
  baseUrl:
    "https://booksy.com/en-us/155582_akro-beauty-by-la-morocha-makeup_hair-salon_134763_orlando/staffer/880999",
  location: "8865 Commodity Circle, Suite 7A, Orlando, 32819",
  phone: "(407) 555-0123", // Add actual phone if available
  specialties: [
    "Curly hair expert (Especialista en Cabello rizado)",
    "Hair color and treatments",
    "Scalp treatments",
    "Bridal hair and makeup",
  ],
};

// Service catalog extracted from Booksy page
const SERVICES = {
  diagnostic: {
    id: "diagnostic",
    name: "Diagnóstico capilar : curly hair",
    price: 0,
    duration: 30,
    category: "consultation",
    description:
      "Free curly hair consultation and diagnosis - perfect for new clients to understand their hair type and needs",
  },
  curlyAdventureFirst: {
    id: "curly-adventure-first",
    name: "Curly Adventure (First Time)",
    price: 200,
    duration: 150,
    category: "curly",
    description:
      "Complete curly hair transformation for new clients - includes consultation, cut, and styling",
  },
  curlyCutDefinition: {
    id: "curly-cut-definition",
    name: "Curly Cut + Simple Definition",
    price: 150,
    duration: 90,
    category: "curly",
    description:
      "Professional curly haircut with styling and definition - great for regular maintenance",
  },
  curlyAdventureRegular: {
    id: "curly-adventure-regular",
    name: "Curly Adventure (Regular client)",
    price: 180,
    duration: 150,
    category: "curly",
    description: "Comprehensive curly hair service for returning clients",
  },
  fullRizos: {
    id: "full-rizos",
    name: "Full Rizos (Cliente Nuevo)",
    price: 200,
    duration: 150,
    category: "curly",
    description: "Complete curly hair service for new Spanish-speaking clients",
  },
  deepWashStyle: {
    id: "deep-wash-style",
    name: "Deep Wash and Style Only",
    price: 150,
    duration: 90,
    category: "curly",
    description: "Deep cleansing wash and styling without cut - refresh your curls",
  },
  curlyColor: {
    id: "curly-color",
    name: "Curly Color Experience",
    price: 250,
    duration: 150,
    category: "color",
    description: "Professional color treatment specifically designed for curly hair",
  },
  hairColor: {
    id: "hair-color",
    name: "Hair color (cambio de color)",
    price: 200,
    duration: 150,
    category: "color",
    description: "Complete hair color change service",
  },
  scalpTreatment: {
    id: "scalp-treatment",
    name: "Scalp treatment, Masaje chino capilar",
    price: 140,
    duration: 90,
    category: "treatment",
    description: "Chinese scalp massage and treatment specifically for curly hair health",
  },
  scalpTreatmentMen: {
    id: "scalp-treatment-men",
    name: "Scalp treatment men (masaje chino hombre)",
    price: 80,
    duration: 45,
    category: "treatment",
    description: "Chinese scalp massage treatment designed for men",
  },
  curlySpa: {
    id: "curly-spa",
    name: "Curly Spa Service (Hair Growth Treatment)",
    price: 180,
    duration: 210,
    category: "treatment",
    description: "Intensive spa treatment focused on promoting healthy hair growth for curly hair",
  },
  photonTherapy: {
    id: "photon-therapy",
    name: "Terapia phot ion, cabello Rizado",
    price: 150,
    duration: 120,
    category: "treatment",
    description: "Advanced photon therapy treatment for curly hair growth and health",
  },
  curlyRestructuring: {
    id: "curly-restructuring",
    name: "Curly Hair Restructuring With Definition",
    price: 180,
    duration: 150,
    category: "curly",
    description: "Intensive restructuring treatment to restore curl pattern and definition",
  },
  bridalService: {
    id: "bridal-service",
    name: "Airbrush Makeup and Hair style for Bride",
    price: 300,
    duration: 120,
    category: "special",
    description: "Complete bridal package with professional airbrush makeup and hair styling",
  },
};

export function getServices(category = "all") {
  const services = Object.values(SERVICES);
  const filtered = category === "all" ? services : services.filter((s) => s.category === category);

  if (filtered.length === 0) {
    return {
      error: `No services found in category "${category}". Available categories: consultation, curly, color, treatment, special, all`,
    };
  }

  return {
    services: filtered.sort((a, b) => a.price - b.price),
    total: filtered.length,
    category: category,
  };
}

export function getBookingLink(serviceId) {
  if (!serviceId) {
    return {
      error:
        "Please provide a service ID. Use /booksy/services to see available services and their IDs.",
    };
  }

  const service = SERVICES[serviceId];
  if (!service) {
    const availableIds = Object.keys(SERVICES).join(", ");
    return {
      error: `Service ID "${serviceId}" not found. Available service IDs: ${availableIds}`,
    };
  }

  // Generate booking URL with fragment to help users navigate
  const bookingUrl = `${TATA_BOOKSY_CONFIG.baseUrl}#ba_s=dl_1`;

  return {
    service,
    bookingUrl,
    instructions: [
      "Click the booking link to open Tata's booking page",
      `Look for "${service.name}" in the services list`,
      "Select your preferred date and time",
      "Fill out the booking form with your details",
      "Confirm your appointment",
    ],
    location: TATA_BOOKSY_CONFIG.location,
    tip: "If you're a first-time client, consider starting with the free consultation!",
  };
}

export function searchServices(keyword) {
  if (!keyword) {
    return {
      error: "Please provide a keyword to search for.",
    };
  }

  const lowerKeyword = keyword.toLowerCase();
  const matches = Object.values(SERVICES).filter(
    (s) =>
      s.name.toLowerCase().includes(lowerKeyword) ||
      s.description.toLowerCase().includes(lowerKeyword) ||
      s.category.includes(lowerKeyword)
  );

  if (matches.length === 0) {
    return {
      error: `No services found matching "${keyword}". Try searching for: curly, cut, color, treatment, spa, massage, or consultation.`,
    };
  }

  return {
    services: matches.sort((a, b) => a.price - b.price),
    total: matches.length,
    keyword,
  };
}

export function getBusinessInfo() {
  return {
    business: TATA_BOOKSY_CONFIG.businessName,
    specialist: TATA_BOOKSY_CONFIG.stafferName,
    location: TATA_BOOKSY_CONFIG.location,
    phone: TATA_BOOKSY_CONFIG.phone,
    specialties: TATA_BOOKSY_CONFIG.specialties,
    rating: "5.0 stars (255 reviews)",
    bookingUrl: TATA_BOOKSY_CONFIG.baseUrl,
    about:
      "Tata specializes in curly hair and understands the unique needs of textured hair. She offers personalized consultations and treatments designed specifically for curly, coily, and wavy hair types.",
  };
}

export function getServiceRecommendations(clientType) {
  if (!clientType) {
    return {
      error:
        "Please specify client type: first-time, regular, color-interested, or treatment-focused",
    };
  }

  let recommendations = [];
  let explanation = "";

  switch (clientType) {
    case "first-time":
      recommendations = ["diagnostic", "curlyAdventureFirst", "fullRizos"];
      explanation =
        "For first-time clients, I recommend starting with a consultation to understand your hair, then considering a complete transformation service.";
      break;

    case "regular":
      recommendations = ["curlyCutDefinition", "deepWashStyle", "curlyAdventureRegular"];
      explanation =
        "For regular clients, these services help maintain and enhance your curls between major treatments.";
      break;

    case "color-interested":
      recommendations = ["curlyColor", "hairColor", "diagnostic"];
      explanation =
        "For color services, Tata specializes in color treatments designed specifically for curly hair to maintain curl pattern and health.";
      break;

    case "treatment-focused":
      recommendations = ["curlySpa", "scalpTreatment", "photonTherapy", "curlyRestructuring"];
      explanation =
        "For hair health and growth, these treatments focus on scalp health, curl restoration, and overall hair wellness.";
      break;

    default:
      return {
        error:
          "Invalid client type. Please use: first-time, regular, color-interested, or treatment-focused",
      };
  }

  const recommendedServices = recommendations.map((id) => SERVICES[id]).filter(Boolean);

  return {
    clientType,
    explanation,
    recommendations: recommendedServices,
    total: recommendedServices.length,
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Enable CORS
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // REST API endpoints
      if (path === "/booksy/services" && request.method === "GET") {
        const category = url.searchParams.get("category") || "all";
        const result = getServices(category);
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      if (path === "/booksy/booking" && request.method === "GET") {
        const serviceId = url.searchParams.get("serviceId");
        const result = getBookingLink(serviceId);
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      if (path === "/booksy/search" && request.method === "GET") {
        const keyword = url.searchParams.get("q");
        const result = searchServices(keyword);
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      if (path === "/booksy/business" && request.method === "GET") {
        const result = getBusinessInfo();
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      if (path === "/booksy/recommendations" && request.method === "GET") {
        const clientType = url.searchParams.get("clientType");
        const result = getServiceRecommendations(clientType);
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Legacy MCP endpoint for compatibility
      if (path === "/booksy/mcp" && request.method === "POST") {
        const body = await request.json();

        if (body.method === "tools/list") {
          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              id: body.id,
              result: {
                tools: [
                  { name: "get_services", description: "Get list of services" },
                  { name: "get_booking_link", description: "Get booking link for service" },
                  { name: "search_services", description: "Search services by keyword" },
                  { name: "get_business_info", description: "Get business information" },
                  {
                    name: "get_service_recommendations",
                    description: "Get service recommendations",
                  },
                ],
              },
            }),
            {
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }

        if (body.method === "tools/call") {
          const { name, arguments: args } = body.params;
          let result;

          switch (name) {
            case "get_services":
              result = getServices(args?.category);
              break;
            case "get_booking_link":
              result = getBookingLink(args?.serviceId);
              break;
            case "search_services":
              result = searchServices(args?.keyword);
              break;
            case "get_business_info":
              result = getBusinessInfo();
              break;
            case "get_service_recommendations":
              result = getServiceRecommendations(args?.clientType);
              break;
            default:
              result = { error: `Unknown tool: ${name}` };
          }

          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              id: body.id,
              result: {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
              },
            }),
            {
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }
      }

      return new Response("Not Found", { status: 404, headers: corsHeaders });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  },
};
