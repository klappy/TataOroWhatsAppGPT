import { renderSummaryHTML } from '../shared/summary.js';

export async function handleSummaryRequest(request, env) {
  const url = new URL(request.url);
  const baseUrl = url.origin;
  // Do not handle /images/* here — served by dedicated images worker
  if (request.method === "GET" && url.pathname.startsWith("/summary/")) {
    const rawId = decodeURIComponent(url.pathname.slice("/summary/".length));
    let phone = rawId;
    try {
      const decoded = atob(rawId);
      if (decoded.startsWith("whatsapp:+")) phone = decoded;
    } catch {}
    const { chatHistoryKey, mediaPrefix, normalizePhoneNumber } = await import(
      "../shared/storageKeys.js"
    );
    const sessionKey = chatHistoryKey("whatsapp", normalizePhoneNumber(phone));
    const stored = await env.CHAT_HISTORY.get(sessionKey, { type: "json" });
    if (!stored)
      return new Response("Not found", {
        status: 404,
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
      });
    const session = stored;
    const { objects: objs } = await env.MEDIA_BUCKET.list({
      prefix: mediaPrefix("whatsapp", normalizePhoneNumber(phone)),
    });
    const html = renderSummaryHTML({
      session,
      mediaObjects: objs,
      phone,
      baseUrl,
    });
    return new Response(html, {
      headers: { "Content-Type": "text/html;charset=UTF-8" },
    });
  }
  return new Response("Not Found", { status: 404 });
}
