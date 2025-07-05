/**
 * Booksy MCP Server for Tata Oro
 *
 * Provides service discovery and booking assistance for Tata Oro's Booksy integration
 * Since Booksy doesn't provide a public API, this uses a service catalog approach
 * with direct booking links to Tata's specific Booksy page.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

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

class BooksyMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: "booksy-tata",
        version: "1.0.0",
        description:
          "MCP server for Tata Oro's Booksy integration - service discovery and booking assistance",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler("tools/list", async () => ({
      tools: [
        {
          name: "get_services",
          description:
            "Get list of Tata's services with prices and durations, optionally filtered by category",
          inputSchema: {
            type: "object",
            properties: {
              category: {
                type: "string",
                description:
                  "Filter by category: consultation, curly, color, treatment, special, or all",
                enum: ["consultation", "curly", "color", "treatment", "special", "all"],
              },
            },
          },
        },
        {
          name: "get_booking_link",
          description: "Get a direct booking link for a specific service with instructions",
          inputSchema: {
            type: "object",
            properties: {
              serviceId: {
                type: "string",
                description:
                  "Service ID from get_services (e.g., curly-cut-definition, diagnostic)",
              },
            },
            required: ["serviceId"],
          },
        },
        {
          name: "search_services",
          description: "Search services by keyword in name or description",
          inputSchema: {
            type: "object",
            properties: {
              keyword: {
                type: "string",
                description: "Keyword to search for (e.g., cut, color, treatment, first time)",
              },
            },
            required: ["keyword"],
          },
        },
        {
          name: "get_business_info",
          description: "Get Tata's business information, location, and specialties",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_service_recommendations",
          description: "Get service recommendations based on client type or needs",
          inputSchema: {
            type: "object",
            properties: {
              clientType: {
                type: "string",
                description:
                  "Type of client: first-time, regular, color-interested, treatment-focused",
                enum: ["first-time", "regular", "color-interested", "treatment-focused"],
              },
            },
            required: ["clientType"],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler("tools/call", async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "get_services":
            return this.getServices(args?.category || "all");

          case "get_booking_link":
            return this.getBookingLink(args?.serviceId);

          case "search_services":
            return this.searchServices(args?.keyword);

          case "get_business_info":
            return this.getBusinessInfo();

          case "get_service_recommendations":
            return this.getServiceRecommendations(args?.clientType);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async getServices(category) {
    const services = Object.values(SERVICES);
    const filtered =
      category === "all" ? services : services.filter((s) => s.category === category);

    if (filtered.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No services found in category "${category}". Available categories: consultation, curly, color, treatment, special, all`,
          },
        ],
      };
    }

    const serviceList = filtered
      .sort((a, b) => a.price - b.price) // Sort by price
      .map(
        (s) =>
          `• **${s.name}**\n  Price: ${s.price === 0 ? "FREE" : `$${s.price}`} | Duration: ${
            s.duration
          } minutes\n  ${s.description}`
      )
      .join("\n\n");

    return {
      content: [
        {
          type: "text",
          text: `Found ${filtered.length} service${filtered.length !== 1 ? "s" : ""}${
            category !== "all" ? ` in category "${category}"` : ""
          }:\n\n${serviceList}`,
        },
      ],
    };
  }

  async getBookingLink(serviceId) {
    if (!serviceId) {
      return {
        content: [
          {
            type: "text",
            text: "Please provide a service ID. Use get_services to see available services and their IDs.",
          },
        ],
        isError: true,
      };
    }

    const service = SERVICES[serviceId];
    if (!service) {
      const availableIds = Object.keys(SERVICES).join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Service ID "${serviceId}" not found. Available service IDs: ${availableIds}`,
          },
        ],
        isError: true,
      };
    }

    // Generate booking URL with fragment to help users navigate
    const bookingUrl = `${TATA_BOOKSY_CONFIG.baseUrl}#ba_s=dl_1`;

    return {
      content: [
        {
          type: "text",
          text:
            `**Booking Information for "${service.name}"**\n\n` +
            `🔗 **Direct Booking Link:** ${bookingUrl}\n\n` +
            `📋 **Instructions for Client:**\n` +
            `1. Click the link above to open Tata's booking page\n` +
            `2. Look for "${service.name}" in the services list\n` +
            `3. Select your preferred date and time\n` +
            `4. Fill out the booking form with your details\n` +
            `5. Confirm your appointment\n\n` +
            `💰 **Service Details:**\n` +
            `• Price: ${service.price === 0 ? "FREE" : `$${service.price}`}\n` +
            `• Duration: ${service.duration} minutes\n` +
            `• Category: ${service.category}\n\n` +
            `📍 **Location:** ${TATA_BOOKSY_CONFIG.location}\n\n` +
            `💡 **Tip:** If you're a first-time client, consider starting with the free consultation!`,
        },
      ],
    };
  }

  async searchServices(keyword) {
    if (!keyword) {
      return {
        content: [
          {
            type: "text",
            text: "Please provide a keyword to search for.",
          },
        ],
        isError: true,
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
        content: [
          {
            type: "text",
            text: `No services found matching "${keyword}". Try searching for: curly, cut, color, treatment, spa, massage, or consultation.`,
          },
        ],
      };
    }

    const matchList = matches
      .sort((a, b) => a.price - b.price)
      .map(
        (s) =>
          `• **${s.name}**\n  Price: ${s.price === 0 ? "FREE" : `$${s.price}`} | Duration: ${
            s.duration
          } minutes\n  ${s.description}`
      )
      .join("\n\n");

    return {
      content: [
        {
          type: "text",
          text: `Found ${matches.length} service${
            matches.length !== 1 ? "s" : ""
          } matching "${keyword}":\n\n${matchList}`,
        },
      ],
    };
  }

  async getBusinessInfo() {
    return {
      content: [
        {
          type: "text",
          text:
            `**Tata Oro - Curly Hair Specialist**\n\n` +
            `👩‍🦱 **Specialist:** ${TATA_BOOKSY_CONFIG.stafferName}\n` +
            `🏢 **Business:** ${TATA_BOOKSY_CONFIG.businessName}\n` +
            `📍 **Location:** ${TATA_BOOKSY_CONFIG.location}\n\n` +
            `🎯 **Specialties:**\n` +
            TATA_BOOKSY_CONFIG.specialties.map((s) => `• ${s}`).join("\n") +
            "\n\n" +
            `⭐ **Rating:** 5.0 stars (255 reviews)\n\n` +
            `🔗 **Book Online:** ${TATA_BOOKSY_CONFIG.baseUrl}\n\n` +
            `💡 **About Tata:** Tata specializes in curly hair and understands the unique needs of textured hair. ` +
            `She offers personalized consultations and treatments designed specifically for curly, coily, and wavy hair types.`,
        },
      ],
    };
  }

  async getServiceRecommendations(clientType) {
    if (!clientType) {
      return {
        content: [
          {
            type: "text",
            text: "Please specify client type: first-time, regular, color-interested, or treatment-focused",
          },
        ],
        isError: true,
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
          content: [
            {
              type: "text",
              text: "Invalid client type. Please use: first-time, regular, color-interested, or treatment-focused",
            },
          ],
          isError: true,
        };
    }

    const recommendedServices = recommendations
      .map((id) => SERVICES[id])
      .filter(Boolean)
      .map(
        (s) =>
          `• **${s.name}**\n  Price: ${s.price === 0 ? "FREE" : `$${s.price}`} | Duration: ${
            s.duration
          } minutes\n  ${s.description}`
      )
      .join("\n\n");

    return {
      content: [
        {
          type: "text",
          text: `**Recommendations for ${clientType} clients:**\n\n${explanation}\n\n${recommendedServices}`,
        },
      ],
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Booksy MCP Server for Tata Oro started successfully");
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new BooksyMCPServer();
  server.start().catch(console.error);
}

export default BooksyMCPServer;
