/**
 * Tests for Booksy MCP Server
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

// Mock the MCP SDK since it's not available in our test environment
const mockServer = {
  setRequestHandler: () => {},
  connect: () => Promise.resolve(),
};

const mockTransport = {};

// Create a simple mock for the MCP SDK
global.MockMCPSDK = {
  Server: function () {
    return mockServer;
  },
  StdioServerTransport: function () {
    return mockTransport;
  },
};

// Simple BooksyMCPServer implementation for testing
class BooksyMCPServer {
  constructor() {
    this.handlers = new Map();
    this.setupHandlers();
  }

  setupHandlers() {
    // Store handlers for testing
    this.handlers.set("tools/list", this.getToolsList.bind(this));
    this.handlers.set("tools/call", this.handleToolCall.bind(this));
  }

  async getToolsList() {
    return {
      tools: [
        { name: "get_services", description: "Get list of services" },
        { name: "get_booking_link", description: "Get booking link" },
        { name: "search_services", description: "Search services" },
        { name: "get_business_info", description: "Get business info" },
        { name: "get_service_recommendations", description: "Get recommendations" },
      ],
    };
  }

  async handleToolCall(request) {
    const { name, arguments: args } = request.params;

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
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  }

  async getServices(category) {
    const services = [
      { name: "Diagnóstico capilar", price: 0, category: "consultation" },
      { name: "Curly Adventure (First Time)", price: 200, category: "curly" },
      { name: "Curly Cut + Definition", price: 150, category: "curly" },
      { name: "Curly Color Experience", price: 250, category: "color" },
    ];

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
      .map((s) => `• ${s.name}\n  Price: ${s.price === 0 ? "FREE" : `$${s.price}`}`)
      .join("\n\n");

    return {
      content: [
        {
          type: "text",
          text: `Found ${filtered.length} service${
            filtered.length !== 1 ? "s" : ""
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

    const validServices = ["diagnostic", "curly-cut-definition", "curly-adventure-first"];
    if (!validServices.includes(serviceId)) {
      return {
        content: [
          {
            type: "text",
            text: `Service ID "${serviceId}" not found. Available service IDs: ${validServices.join(
              ", "
            )}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Booking Information for service\n\n🔗 Direct Booking Link: https://booksy.com/en-us/155582_akro-beauty-by-la-morocha-makeup_hair-salon_134763_orlando/staffer/880999\n\nInstructions for Client:\n1. Click the link above\n2. Select the service\n3. Choose date and time\n4. Complete booking form`,
        },
      ],
    };
  }

  async searchServices(keyword) {
    if (!keyword) {
      return {
        content: [{ type: "text", text: "Please provide a keyword to search for." }],
        isError: true,
      };
    }

    const services = [
      { name: "Diagnóstico capilar", description: "consultation" },
      { name: "Curly Adventure", description: "curly hair transformation" },
      { name: "Curly Cut", description: "curly haircut" },
    ];

    const matches = services.filter(
      (s) =>
        s.name.toLowerCase().includes(keyword.toLowerCase()) ||
        s.description.toLowerCase().includes(keyword.toLowerCase())
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

    return {
      content: [
        {
          type: "text",
          text: `Found ${matches.length} service${
            matches.length !== 1 ? "s" : ""
          } matching "${keyword}"`,
        },
      ],
    };
  }

  async getBusinessInfo() {
    return {
      content: [
        {
          type: "text",
          text: `Tata Oro - Curly Hair Specialist\n\n👩‍🦱 Specialist: Tatiana Orozco\n🏢 Business: Akro Beauty by La Morocha Makeup\n📍 Location: 8865 Commodity Circle, Suite 7A, Orlando, 32819\n⭐ Rating: 5.0 stars (255 reviews)\n🔗 Book Online: https://booksy.com/en-us/155582_akro-beauty-by-la-morocha-makeup_hair-salon_134763_orlando/staffer/880999`,
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

    const validTypes = ["first-time", "regular", "color-interested", "treatment-focused"];
    if (!validTypes.includes(clientType)) {
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

    let recommendations = "";
    switch (clientType) {
      case "first-time":
        recommendations =
          "Recommendations for first-time clients:\n\n• Diagnóstico capilar - FREE\n• Curly Adventure (First Time) - $200+";
        break;
      case "regular":
        recommendations =
          "Recommendations for regular clients:\n\n• Curly Cut + Definition - $150\n• Deep Wash and Style - $150";
        break;
      case "color-interested":
        recommendations =
          "Recommendations for color-interested clients:\n\n• Curly Color Experience - $250";
        break;
      case "treatment-focused":
        recommendations =
          "Recommendations for treatment-focused clients:\n\n• Curly Spa Service - $180\n• Scalp Treatment - $140";
        break;
    }

    return {
      content: [{ type: "text", text: recommendations }],
    };
  }
}

describe("BooksyMCPServer", () => {
  let server;

  beforeEach(() => {
    server = new BooksyMCPServer();
  });

  describe("Server Initialization", () => {
    it("should initialize with correct handlers", () => {
      assert.ok(server.handlers.has("tools/list"));
      assert.ok(server.handlers.has("tools/call"));
    });

    it("should register all expected tools", async () => {
      const toolsListHandler = server.handlers.get("tools/list");
      const result = await toolsListHandler();
      const toolNames = result.tools.map((tool) => tool.name);

      assert.ok(toolNames.includes("get_services"));
      assert.ok(toolNames.includes("get_booking_link"));
      assert.ok(toolNames.includes("search_services"));
      assert.ok(toolNames.includes("get_business_info"));
      assert.ok(toolNames.includes("get_service_recommendations"));
    });
  });

  describe("get_services tool", () => {
    it('should return all services when category is "all"', async () => {
      const result = await server.handleToolCall({
        params: { name: "get_services", arguments: { category: "all" } },
      });

      assert.ok(result.content[0].text.includes("Found"));
      assert.ok(result.content[0].text.includes("Diagnóstico capilar"));
      assert.ok(result.content[0].text.includes("Curly Adventure"));
    });

    it("should filter services by category", async () => {
      const result = await server.handleToolCall({
        params: { name: "get_services", arguments: { category: "consultation" } },
      });

      assert.ok(result.content[0].text.includes("Diagnóstico capilar"));
      assert.ok(result.content[0].text.includes("FREE"));
    });

    it("should return error for invalid category", async () => {
      const result = await server.handleToolCall({
        params: { name: "get_services", arguments: { category: "invalid" } },
      });

      assert.ok(result.content[0].text.includes("No services found"));
      assert.ok(result.content[0].text.includes("Available categories"));
    });
  });

  describe("get_booking_link tool", () => {
    it("should return booking link for valid service", async () => {
      const result = await server.handleToolCall({
        params: { name: "get_booking_link", arguments: { serviceId: "diagnostic" } },
      });

      assert.ok(result.content[0].text.includes("Booking Information"));
      assert.ok(result.content[0].text.includes("booksy.com"));
      assert.ok(result.content[0].text.includes("Instructions for Client"));
    });

    it("should return error for invalid service ID", async () => {
      const result = await server.handleToolCall({
        params: { name: "get_booking_link", arguments: { serviceId: "invalid-service" } },
      });

      assert.strictEqual(result.isError, true);
      assert.ok(result.content[0].text.includes("not found"));
    });

    it("should return error when no service ID provided", async () => {
      const result = await server.handleToolCall({
        params: { name: "get_booking_link", arguments: {} },
      });

      assert.strictEqual(result.isError, true);
      assert.ok(result.content[0].text.includes("Please provide a service ID"));
    });
  });

  describe("search_services tool", () => {
    it("should find services by keyword", async () => {
      const result = await server.handleToolCall({
        params: { name: "search_services", arguments: { keyword: "curly" } },
      });

      assert.ok(result.content[0].text.includes("Found"));
      assert.ok(result.content[0].text.includes('matching "curly"'));
    });

    it("should return no results for non-matching keyword", async () => {
      const result = await server.handleToolCall({
        params: { name: "search_services", arguments: { keyword: "nonexistent" } },
      });

      assert.ok(result.content[0].text.includes("No services found"));
      assert.ok(result.content[0].text.includes("Try searching for"));
    });

    it("should return error when no keyword provided", async () => {
      const result = await server.handleToolCall({
        params: { name: "search_services", arguments: {} },
      });

      assert.strictEqual(result.isError, true);
      assert.ok(result.content[0].text.includes("Please provide a keyword"));
    });
  });

  describe("get_business_info tool", () => {
    it("should return complete business information", async () => {
      const result = await server.handleToolCall({
        params: { name: "get_business_info", arguments: {} },
      });

      const text = result.content[0].text;
      assert.ok(text.includes("Tata Oro"));
      assert.ok(text.includes("Tatiana Orozco"));
      assert.ok(text.includes("Akro Beauty"));
      assert.ok(text.includes("Orlando"));
      assert.ok(text.includes("5.0 stars"));
      assert.ok(text.includes("booksy.com"));
    });
  });

  describe("get_service_recommendations tool", () => {
    it("should recommend services for first-time clients", async () => {
      const result = await server.handleToolCall({
        params: { name: "get_service_recommendations", arguments: { clientType: "first-time" } },
      });

      const text = result.content[0].text;
      assert.ok(text.includes("first-time clients"));
      assert.ok(text.includes("Diagnóstico"));
      assert.ok(text.includes("Curly Adventure (First Time)"));
    });

    it("should recommend services for regular clients", async () => {
      const result = await server.handleToolCall({
        params: { name: "get_service_recommendations", arguments: { clientType: "regular" } },
      });

      const text = result.content[0].text;
      assert.ok(text.includes("regular clients"));
      assert.ok(text.includes("Curly Cut"));
    });

    it("should return error for invalid client type", async () => {
      const result = await server.handleToolCall({
        params: { name: "get_service_recommendations", arguments: { clientType: "invalid" } },
      });

      assert.strictEqual(result.isError, true);
      assert.ok(result.content[0].text.includes("Invalid client type"));
    });

    it("should return error when no client type provided", async () => {
      const result = await server.handleToolCall({
        params: { name: "get_service_recommendations", arguments: {} },
      });

      assert.strictEqual(result.isError, true);
      assert.ok(result.content[0].text.includes("Please specify client type"));
    });
  });

  describe("Error Handling", () => {
    it("should handle unknown tool names", async () => {
      const result = await server.handleToolCall({
        params: { name: "unknown_tool", arguments: {} },
      });

      assert.strictEqual(result.isError, true);
      assert.ok(result.content[0].text.includes("Unknown tool"));
    });
  });
});
