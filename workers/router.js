import { handleWhatsAppRequest } from "./whatsapp-incoming.js";
import { handleImagesRequest } from "./images.js";
import { handleAdminRequest } from "./admin.js";
import { handleSummaryRequest } from "./summary.js";
import { handleUploadHookRequest } from "./upload-hook.js";
import { handleDocSyncRequest } from "./doc-sync.js";
import booksyDynamicWorker from "./booksy-dynamic.js";

export function selectHandler(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (path.startsWith("/whatsapp/incoming")) return handleWhatsAppRequest;
  if (path.startsWith("/images/")) return handleImagesRequest;
  if (path.startsWith("/admin")) return handleAdminRequest;
  if (path.startsWith("/summary")) return handleSummaryRequest;
  if (path.startsWith("/booksy"))
    return (req, env, ctx) => booksyDynamicWorker.fetch(req, env, ctx);
  if (path === "/uploadhook" && request.method === "POST") return handleUploadHookRequest;
  if (path === "/internal/doc-sync" && request.method === "POST") return handleDocSyncRequest;
  return null;
}

export default {
  async fetch(request, env, ctx) {
    const handler = selectHandler(request);
    if (handler) {
      return handler(request, env, ctx);
    }
    return new Response("Not Found", { status: 404 });
  },
};
