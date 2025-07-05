/**
 * Unit tests for Booksy Service Discovery
 */

import { test } from "node:test";
import assert from "node:assert";
import booksyWorker from "../workers/booksy-mcp.js";

const mockEnv = {};
const mockCtx = {};

// Helper to create request objects
function createRequest(path, method = "GET", body = null) {
  const url = `https://wa.tataoro.com${path}`;
  return {
    url,
    method,
    json: async () => body,
  };
}

test("Booksy Service Discovery", async (t) => {
  await t.test("GET /booksy/services - should return all services", async () => {
    const request = createRequest("/booksy/services");
    const response = await booksyWorker.fetch(request, mockEnv, mockCtx);
    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.ok(data.services);
    assert.ok(Array.isArray(data.services));
    assert.ok(data.services.length > 0);
    assert.strictEqual(data.category, "all");
    assert.strictEqual(data.total, data.services.length);
  });

  await t.test("GET /booksy/services?category=curly - should filter by category", async () => {
    const request = createRequest("/booksy/services?category=curly");
    const response = await booksyWorker.fetch(request, mockEnv, mockCtx);
    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.ok(data.services);
    assert.ok(data.services.every((s) => s.category === "curly"));
    assert.strictEqual(data.category, "curly");
  });

  await t.test("GET /booksy/services?category=invalid - should return error", async () => {
    const request = createRequest("/booksy/services?category=invalid");
    const response = await booksyWorker.fetch(request, mockEnv, mockCtx);
    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.ok(data.error);
    assert.ok(data.error.includes("No services found"));
  });

  await t.test(
    "GET /booksy/booking?serviceId=diagnostic - should return booking info",
    async () => {
      const request = createRequest("/booksy/booking?serviceId=diagnostic");
      const response = await booksyWorker.fetch(request, mockEnv, mockCtx);
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.ok(data.service);
      assert.ok(data.bookingUrl);
      assert.ok(data.instructions);
      assert.ok(Array.isArray(data.instructions));
      assert.strictEqual(data.service.id, "diagnostic");
    }
  );

  await t.test("GET /booksy/booking?serviceId=invalid - should return error", async () => {
    const request = createRequest("/booksy/booking?serviceId=invalid");
    const response = await booksyWorker.fetch(request, mockEnv, mockCtx);
    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.ok(data.error);
    assert.ok(data.error.includes("not found"));
  });

  await t.test("GET /booksy/booking (no serviceId) - should return error", async () => {
    const request = createRequest("/booksy/booking");
    const response = await booksyWorker.fetch(request, mockEnv, mockCtx);
    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.ok(data.error);
    assert.ok(data.error.includes("provide a service ID"));
  });

  await t.test("GET /booksy/search?q=curly - should find matching services", async () => {
    const request = createRequest("/booksy/search?q=curly");
    const response = await booksyWorker.fetch(request, mockEnv, mockCtx);
    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.ok(data.services);
    assert.ok(data.services.length > 0);
    assert.strictEqual(data.keyword, "curly");
    assert.ok(
      data.services.every(
        (s) =>
          s.name.toLowerCase().includes("curly") ||
          s.description.toLowerCase().includes("curly") ||
          s.category.includes("curly")
      )
    );
  });

  await t.test("GET /booksy/search?q=nonexistent - should return no results", async () => {
    const request = createRequest("/booksy/search?q=nonexistent");
    const response = await booksyWorker.fetch(request, mockEnv, mockCtx);
    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.ok(data.error);
    assert.ok(data.error.includes("No services found"));
  });

  await t.test("GET /booksy/search (no keyword) - should return error", async () => {
    const request = createRequest("/booksy/search");
    const response = await booksyWorker.fetch(request, mockEnv, mockCtx);
    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.ok(data.error);
    assert.ok(data.error.includes("provide a keyword"));
  });

  await t.test("GET /booksy/business - should return business information", async () => {
    const request = createRequest("/booksy/business");
    const response = await booksyWorker.fetch(request, mockEnv, mockCtx);
    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.ok(data.business);
    assert.ok(data.specialist);
    assert.ok(data.location);
    assert.ok(data.specialties);
    assert.ok(Array.isArray(data.specialties));
    assert.ok(data.bookingUrl);
  });

  await t.test(
    "GET /booksy/recommendations?clientType=first-time - should return recommendations",
    async () => {
      const request = createRequest("/booksy/recommendations?clientType=first-time");
      const response = await booksyWorker.fetch(request, mockEnv, mockCtx);
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.strictEqual(data.clientType, "first-time");
      assert.ok(data.explanation);
      assert.ok(data.recommendations);
      assert.ok(Array.isArray(data.recommendations));
      assert.ok(data.recommendations.length > 0);
    }
  );

  await t.test(
    "GET /booksy/recommendations?clientType=regular - should return different recommendations",
    async () => {
      const request = createRequest("/booksy/recommendations?clientType=regular");
      const response = await booksyWorker.fetch(request, mockEnv, mockCtx);
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.strictEqual(data.clientType, "regular");
      assert.ok(data.recommendations);
      assert.ok(data.recommendations.length > 0);
    }
  );

  await t.test("GET /booksy/recommendations?clientType=invalid - should return error", async () => {
    const request = createRequest("/booksy/recommendations?clientType=invalid");
    const response = await booksyWorker.fetch(request, mockEnv, mockCtx);
    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.ok(data.error);
    assert.ok(data.error.includes("Invalid client type"));
  });

  await t.test("GET /booksy/recommendations (no clientType) - should return error", async () => {
    const request = createRequest("/booksy/recommendations");
    const response = await booksyWorker.fetch(request, mockEnv, mockCtx);
    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.ok(data.error);
    assert.ok(data.error.includes("specify client type"));
  });

  await t.test("POST /booksy/mcp (tools/list) - should return available tools", async () => {
    const request = createRequest("/booksy/mcp", "POST", {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    });
    const response = await booksyWorker.fetch(request, mockEnv, mockCtx);
    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.strictEqual(data.jsonrpc, "2.0");
    assert.strictEqual(data.id, 1);
    assert.ok(data.result.tools);
    assert.ok(Array.isArray(data.result.tools));
    assert.strictEqual(data.result.tools.length, 5);
  });

  await t.test("POST /booksy/mcp (tools/call) - should handle tool calls", async () => {
    const request = createRequest("/booksy/mcp", "POST", {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "get_services",
        arguments: { category: "all" },
      },
    });
    const response = await booksyWorker.fetch(request, mockEnv, mockCtx);
    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.strictEqual(data.jsonrpc, "2.0");
    assert.strictEqual(data.id, 1);
    assert.ok(data.result.content);
    assert.ok(Array.isArray(data.result.content));
  });

  await t.test("GET /booksy/unknown - should return 404", async () => {
    const request = createRequest("/booksy/unknown");
    const response = await booksyWorker.fetch(request, mockEnv, mockCtx);

    assert.strictEqual(response.status, 404);
  });
});
