import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { selectHandler } from "../workers/router.js";
import { handleWhatsAppRequest } from "../workers/whatsapp-incoming.js";
import { handleImagesRequest } from "../workers/images.js";
import { handleAdminRequest } from "../workers/admin.js";
import { handleSummaryRequest } from "../workers/summary.js";
import { handleUploadHookRequest } from "../workers/upload-hook.js";
import { handleDocSyncRequest } from "../workers/doc-sync.js";

function makeRequest(path, method = "GET") {
  return { url: "https://wa.tataoro.com" + path, method };
}

describe("router selectHandler", () => {
  it("routes /whatsapp/incoming to WhatsApp handler", () => {
    const h = selectHandler(makeRequest("/whatsapp/incoming", "POST"));
    assert.strictEqual(h, handleWhatsAppRequest);
  });

  it("routes /images/* to images handler", () => {
    const h = selectHandler(makeRequest("/images/x.jpg"));
    assert.strictEqual(h, handleImagesRequest);
  });

  it("routes /admin to admin handler", () => {
    const h = selectHandler(makeRequest("/admin"));
    assert.strictEqual(h, handleAdminRequest);
  });

  it("routes /summary to summary handler", () => {
    const h = selectHandler(makeRequest("/summary/abc"));
    assert.strictEqual(h, handleSummaryRequest);
  });

  it("routes /uploadhook POST to upload-hook handler", () => {
    const h = selectHandler(makeRequest("/uploadhook", "POST"));
    assert.strictEqual(h, handleUploadHookRequest);
  });

  it("routes /internal/doc-sync POST to doc-sync handler", () => {
    const h = selectHandler(makeRequest("/internal/doc-sync", "POST"));
    assert.strictEqual(h, handleDocSyncRequest);
  });

  it("routes /booksy/* to booksy MCP handler", () => {
    const h = selectHandler(makeRequest("/booksy/mcp", "POST"));
    assert.ok(typeof h === "function", "Should return a function for Booksy routes");
  });

  it("returns null for unknown routes", () => {
    const h = selectHandler(makeRequest("/nope"));
    assert.strictEqual(h, null);
  });
});
