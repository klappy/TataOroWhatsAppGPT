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
    const htmlParts = [];
    htmlParts.push(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Consultation Summary</title><style>body{white-space:pre-line;font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:auto;padding:1em;background-color:#ece5dd}h1{color:#075e54;font-size:1.5em;margin-bottom:0.5em}.metadata{font-size:0.9em;color:#666;margin-bottom:1em}.bubble{border-radius:0.4em;padding:0.75em;margin:0.5em 0;max-width:90%;clear:both}.user{background-color:#dcf8c6;align-self:flex-end;float:right}.assistant{background-color:#fff;align-self:flex-start;float:left}.summary{background-color:#fff8e1;padding:1em;margin:1em 0;border-left:4px solid #ffeb3b;white-space:pre-line}img{max-width:100%;border-radius:0.3em;margin:0.25em 0}a{color:#128c7e;word-break:break-word}</style></head><body><h1>Consultation Summary</h1>'
    );
    htmlParts.push(
      `<div class="metadata"><p>Progress status: ${escapeXml(
        session.progress_status
      )}</p><p>Last active: ${escapeXml(
        new Date(session.last_active * 1000).toLocaleString()
      )}</p>${session.summary ? `<p class="summary">${escapeXml(session.summary)}</p>` : ""}</div>`
    );
    htmlParts.push('<div class="messages">');
    for (const msg of session.history || []) {
      htmlParts.push(
        `<div class="message bubble ${msg.role}"><strong>${escapeXml(msg.role)}:</strong> `
      );
      if (typeof msg.content === "string") {
        htmlParts.push(escapeXml(msg.content));
      } else if (Array.isArray(msg.content)) {
        for (const entry of msg.content) {
          if (entry.type === "text" && entry.text) htmlParts.push(escapeXml(entry.text));
          if (entry.type === "image_url" && entry.image_url?.url)
            htmlParts.push(`<img src="${escapeXml(entry.image_url.url)}">`);
        }
      }
      htmlParts.push("</div>");
    }
    htmlParts.push("</div>");
    if (objs?.length) {
      htmlParts.push("<h2>Uploaded Images</h2>");
      for (const obj of objs) {
        htmlParts.push(`<img src="${baseUrl}/images/${encodeURIComponent(obj.key)}">`);
      }
    }
    htmlParts.push("</body></html>");
    return new Response(htmlParts.join(""), {
      headers: { "Content-Type": "text/html;charset=UTF-8" },
    });
  }
  return new Response("Not Found", { status: 404 });

  function escapeXml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }
}
