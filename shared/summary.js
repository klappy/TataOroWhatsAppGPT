import { chatCompletion } from './gpt.js';

/**
 * Generate or reuse stored consultation summary, including dynamic image listing from R2.
 * @param {object} options
 * @param {object} options.env - Worker environment bindings (including MEDIA_BUCKET, OPENAI_API_KEY)
 * @param {object} options.session - Session data with history and cached summary
 * @param {string} options.phone - User phone identifier used as R2 prefix
 * @param {string} [options.baseUrl] - Optional base URL for image proxy endpoint (e.g., https://wa.tataoro.com)
 * @returns {Promise<string>}
 */
export async function generateOrFetchSummary({ env, session, phone, baseUrl }) {
  if (session.summary) {
    return session.summary;
  }
  const prefix = `${phone}/`;
  const list = await env.MEDIA_BUCKET.list({ prefix });
  const photoUrls = (list.objects || []).map(obj => {
    const encoded = encodeURIComponent(obj.key);
    return baseUrl
      ? `${baseUrl}/images/${encoded}`
      : `images/${encoded}`;
  });
  const messages = [
    { role: 'system', content: 'Please provide a concise summary of the following consultation:' },
    ...(photoUrls.length > 0
      ? [{ role: 'system', content: `Photos Provided: ${photoUrls.join(' | ')}` }]
      : []),
    ...session.history.map(msg => ({
      role: msg.role,
      content:
        typeof msg.content === 'string'
          ? msg.content
          : msg.content
              .map(entry => {
                if (entry.type === 'text' && entry.text) return entry.text;
                if (entry.type === 'image_url' && entry.image_url?.url) return entry.image_url.url;
                return '';
              })
              .join(' '),
    })),
  ];
  const summary = await chatCompletion(messages, env.OPENAI_API_KEY);
  // Ensure photo URLs are included even if the model omits them
  let finalSummary = summary;
  if (photoUrls.length > 0 && !photoUrls.every(url => summary.includes(url))) {
    const photoSection = `Photos Provided: ${photoUrls.join(' | ')}`;
    finalSummary = `${summary}\n${photoSection}`;
  }
  return finalSummary;
}

/**
 * Render consultation history and summary to a single HTML string.
 * Used for both the public summary page and summary emails so the
 * layout remains consistent.
 *
 * @param {object} options
 * @param {object} options.session - Session data with history and summary
 * @param {Array} [options.mediaObjects] - Optional R2 objects to display
 * @param {string} [options.phone] - Phone identifier used for image URLs
 * @param {string} [options.baseUrl] - Base URL for public image links
 * @returns {string}
 */
export function renderSummaryHTML({
  session,
  mediaObjects = [],
  phone,
  baseUrl,
}) {
  const escapeHtml = (unsafe) =>
    String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const html = [];
  html.push(
    "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Consultation Summary</title>"
  );
  html.push(
    `<style>body{white-space:pre-line;font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:auto;padding:1em;background-color:#ece5dd}h1{color:#075e54;font-size:1.5em;margin-bottom:0.5em}.metadata{font-size:.9em;color:#666;margin-bottom:1em}.bubble{border-radius:.4em;padding:.75em;margin:.5em 0;max-width:90%;clear:both}.user{background-color:#dcf8c6;align-self:flex-end;float:right}.assistant{background-color:#fff;align-self:flex-start;float:left}.summary{background-color:#fff8e1;padding:1em;margin:1em 0;border-left:4px solid #ffeb3b;white-space:pre-line}img{max-width:100%;border-radius:.3em;margin:.25em 0}a{color:#128c7e;word-break:break-word}</style></head><body><h1>Consultation Summary</h1>`
  );

  html.push(
    `<div class="metadata"><p>Progress status: ${
      escapeHtml(session.progress_status || "")
    }</p><p>Last active: ${escapeHtml(
      session.last_active
        ? new Date(session.last_active * 1000).toLocaleString()
        : ""
    )}</p>${
      session.summary ? `<p class="summary">${escapeHtml(session.summary)}</p>` : ""
    }</div>`
  );

  html.push('<div class="messages">');
  for (const msg of session.history || []) {
    html.push(`<div class="message bubble ${msg.role}"><strong>${msg.role}:</strong> `);
    if (typeof msg.content === "string") {
      html.push(escapeHtml(msg.content));
    } else if (Array.isArray(msg.content)) {
      for (const entry of msg.content) {
        if (entry.type === "text" && entry.text) html.push(escapeHtml(entry.text));
        if (entry.type === "image_url" && entry.image_url?.url)
          html.push(`<img src="${escapeHtml(entry.image_url.url)}">`);
      }
    }
    html.push("</div>");
  }
  html.push("</div>");

  if (mediaObjects.length) {
    html.push("<h2>Uploaded Images</h2>");
    for (const obj of mediaObjects) {
      const encoded = encodeURIComponent(obj.key);
      const url = baseUrl ? `${baseUrl}/images/${encoded}` : `images/${encoded}`;
      html.push(`<img src="${url}">`);
    }
  }

  html.push("</body></html>");
  return html.join("");
}