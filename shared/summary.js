import { chatCompletion } from "./gpt.js";

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
  const photoUrls = (list.objects || []).map((obj) => {
    const encoded = encodeURIComponent(obj.key);
    return baseUrl ? `${baseUrl}/images/${encoded}` : `images/${encoded}`;
  });
  const messages = [
    { role: "system", content: "Please provide a concise summary of the following consultation:" },
    ...(photoUrls.length > 0
      ? [{ role: "system", content: `Photos Provided: ${photoUrls.join(" | ")}` }]
      : []),
    ...session.history.map((msg) => ({
      role: msg.role,
      content:
        typeof msg.content === "string"
          ? msg.content
          : msg.content
              .map((entry) => {
                if (entry.type === "text" && entry.text) return entry.text;
                if (entry.type === "image_url" && entry.image_url?.url) return entry.image_url.url;
                return "";
              })
              .join(" "),
    })),
  ];
  const summary = await chatCompletion(messages, env.OPENAI_API_KEY);
  // Ensure photo URLs are included even if the model omits them
  let finalSummary = summary;
  if (photoUrls.length > 0 && !photoUrls.every((url) => summary.includes(url))) {
    const photoSection = `Photos Provided: ${photoUrls.join(" | ")}`;
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
export function renderSummaryHTML({ session, mediaObjects = [], phone, baseUrl }) {
  const escapeHtml = (unsafe) =>
    String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const html = [];
  html.push("<!DOCTYPE html><html><head><meta charset='utf-8'><title>Consultation Summary</title>");
  html.push(
    `<style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        padding: 20px;
        line-height: 1.6;
      }
      
      .container {
        max-width: 800px;
        margin: 0 auto;
        background: white;
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.1);
        overflow: hidden;
        animation: slideUp 0.6s ease-out;
      }
      
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .header {
        background: linear-gradient(135deg, #ff6b6b, #feca57);
        padding: 40px 30px;
        text-align: center;
        color: white;
        position: relative;
        overflow: hidden;
      }
      
      .header::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="curls" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="2" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23curls)"/></svg>');
        animation: float 20s ease-in-out infinite;
      }
      
      @keyframes float {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-20px) rotate(180deg); }
      }
      
      .header h1 {
        font-size: 2.5em;
        font-weight: 700;
        margin-bottom: 10px;
        position: relative;
        z-index: 1;
      }
      
      .header .subtitle {
        font-size: 1.1em;
        opacity: 0.9;
        position: relative;
        z-index: 1;
      }
      
      .content {
        padding: 40px 30px;
      }
      
      .summary-card {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        border-radius: 15px;
        padding: 25px;
        margin: 30px 0;
        color: white;
        box-shadow: 0 10px 30px rgba(240, 147, 251, 0.3);
        position: relative;
        overflow: hidden;
      }
      
      .summary-card::before {
        content: '✨';
        position: absolute;
        top: 20px;
        right: 20px;
        font-size: 2em;
        opacity: 0.7;
      }
      
      .summary-card h2 {
        font-size: 1.4em;
        margin-bottom: 15px;
        font-weight: 600;
      }
      
      .summary-card p {
        font-size: 1.1em;
        line-height: 1.7;
        white-space: pre-line;
      }
      
      .metadata {
        background: #f8f9fa;
        border-radius: 12px;
        padding: 20px;
        margin: 20px 0;
        border-left: 4px solid #667eea;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
      }
      
      .metadata-item {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .metadata-item .icon {
        width: 24px;
        height: 24px;
        background: #667eea;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 12px;
        font-weight: bold;
      }
      
      .conversation {
        margin: 30px 0;
      }
      
      .conversation h2 {
        color: #2d3748;
        font-size: 1.6em;
        margin-bottom: 25px;
        text-align: center;
        position: relative;
      }
      
      .conversation h2::after {
        content: '';
        position: absolute;
        bottom: -8px;
        left: 50%;
        transform: translateX(-50%);
        width: 60px;
        height: 3px;
        background: linear-gradient(90deg, #667eea, #764ba2);
        border-radius: 2px;
      }
      
      .message {
        margin: 20px 0;
        display: flex;
        gap: 15px;
        animation: fadeInUp 0.5s ease-out;
      }
      
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .message.user {
        flex-direction: row-reverse;
      }
      
      .message .avatar {
        width: 45px;
        height: 45px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: white;
        font-size: 14px;
        flex-shrink: 0;
      }
      
      .message.user .avatar {
        background: linear-gradient(135deg, #667eea, #764ba2);
      }
      
      .message.assistant .avatar {
        background: linear-gradient(135deg, #ff6b6b, #feca57);
      }
      
      .message .bubble {
        max-width: 70%;
        padding: 15px 20px;
        border-radius: 20px;
        position: relative;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        word-wrap: break-word;
      }
      
      .message.user .bubble {
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        border-bottom-right-radius: 5px;
      }
      
      .message.assistant .bubble {
        background: white;
        color: #2d3748;
        border: 1px solid #e2e8f0;
        border-bottom-left-radius: 5px;
      }
      
      .message .bubble::before {
        content: '';
        position: absolute;
        bottom: 0;
        width: 0;
        height: 0;
      }
      
      .message.user .bubble::before {
        right: -8px;
        border: 8px solid transparent;
        border-top-color: #764ba2;
      }
      
      .message.assistant .bubble::before {
        left: -8px;
        border: 8px solid transparent;
        border-top-color: #e2e8f0;
      }
      
      .message-image {
        max-width: 100%;
        border-radius: 12px;
        margin: 10px 0;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        transition: transform 0.3s ease;
      }
      
      .message-image:hover {
        transform: scale(1.02);
      }
      
      .images-section {
        margin: 40px 0;
      }
      
      .images-section h2 {
        color: #2d3748;
        font-size: 1.6em;
        margin-bottom: 25px;
        text-align: center;
      }
      
      .images-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin: 20px 0;
      }
      
      .image-card {
        border-radius: 15px;
        overflow: hidden;
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }
      
      .image-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 15px 35px rgba(0,0,0,0.2);
      }
      
      .image-card img {
        width: 100%;
        height: 200px;
        object-fit: cover;
        display: block;
      }
      
      .footer {
        background: #f8f9fa;
        padding: 30px;
        text-align: center;
        color: #6c757d;
        border-top: 1px solid #e9ecef;
      }
      
      .footer .logo {
        font-size: 1.5em;
        font-weight: bold;
        background: linear-gradient(135deg, #667eea, #764ba2);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 10px;
      }
      
      @media (max-width: 768px) {
        body { padding: 10px; }
        .container { border-radius: 15px; }
        .header { padding: 30px 20px; }
        .header h1 { font-size: 2em; }
        .content { padding: 30px 20px; }
        .message .bubble { max-width: 85%; }
        .images-grid { grid-template-columns: 1fr; }
      }
    </style></head><body>
    <div class="container">
      <div class="header">
        <h1>✨ Curl Consultation</h1>
        <div class="subtitle">Your personalized hair journey with Tata Oro</div>
      </div>
      <div class="content">`
  );

  // Metadata section with modern design
  html.push('<div class="metadata">');
  html.push('<div class="metadata-item">');
  html.push('<div class="icon">📊</div>');
  html.push(
    `<div><strong>Status:</strong> ${escapeHtml(session.progress_status || "In Progress")}</div>`
  );
  html.push("</div>");
  html.push('<div class="metadata-item">');
  html.push('<div class="icon">⏰</div>');
  html.push(
    `<div><strong>Last Active:</strong> ${escapeHtml(
      session.last_active ? new Date(session.last_active * 1000).toLocaleString() : "Recently"
    )}</div>`
  );
  html.push("</div>");
  html.push("</div>");

  // Summary section with modern card design
  if (session.summary) {
    html.push('<div class="summary-card">');
    html.push("<h2>💫 Consultation Summary</h2>");
    html.push(`<p>${escapeHtml(session.summary)}</p>`);
    html.push("</div>");
  }

  html.push('<div class="conversation">');
  html.push("<h2>💬 Conversation</h2>");
  for (const msg of session.history || []) {
    const isUser = msg.role === "user";
    const avatarText = isUser ? "YOU" : "TATA";

    html.push(`<div class="message ${msg.role}">`);
    html.push(`<div class="avatar">${avatarText}</div>`);
    html.push('<div class="bubble">');

    if (typeof msg.content === "string") {
      html.push(escapeHtml(msg.content));
    } else if (Array.isArray(msg.content)) {
      for (const entry of msg.content) {
        if (entry.type === "text" && entry.text) html.push(escapeHtml(entry.text));
        if (entry.type === "image_url" && entry.image_url?.url)
          html.push(`<img src="${escapeHtml(entry.image_url.url)}" class="message-image">`);
      }
    }

    html.push("</div>");
    html.push("</div>");
  }
  html.push("</div>");

  if (mediaObjects.length) {
    html.push('<div class="images-section">');
    html.push("<h2>📸 Uploaded Images</h2>");
    html.push('<div class="images-grid">');
    for (const obj of mediaObjects) {
      const encoded = encodeURIComponent(obj.key);
      const url = baseUrl ? `${baseUrl}/images/${encoded}` : `images/${encoded}`;
      html.push('<div class="image-card">');
      html.push(`<img src="${url}" alt="Consultation image">`);
      html.push("</div>");
    }
    html.push("</div>");
    html.push("</div>");
  }

  html.push("</div>"); // Close content div
  html.push('<div class="footer">');
  html.push('<div class="logo">Tata Oro Beauty</div>');
  html.push("<p>Professional curl consultation & styling services</p>");
  html.push("</div>");
  html.push("</div>"); // Close container div
  html.push("</body></html>");

  return html.join("");
}
export function renderAdminSessionHTML({ session, mediaObjects = [], phone, baseUrl }) {
  const escapeHtml = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  const html = [];
  html.push(
    "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Session " +
      escapeHtml(phone || "") +
      "</title>"
  );
  html.push(
    `<style>body{white-space:pre-line;font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:auto;padding:1em;background-color:#ece5dd}h1{color:#075e54;font-size:1.5em;margin-bottom:.5em}.metadata{font-size:.9em;color:#666;margin-bottom:1em}.bubble{border-radius:.4em;padding:.75em;margin:.5em 0;max-width:90%;clear:both}.user{background-color:#dcf8c6;align-self:flex-end;float:right}.assistant{background-color:#fff;align-self:flex-start;float:left}.summary{background-color:#fff8e1;padding:1em;margin:1em 0;border-left:4px solid #ffeb3b;white-space:pre-line}img{max-width:100%;border-radius:.3em;margin:.25em 0}a{color:#128c7e;word-break:break-word}</style></head><body>`
  );
  html.push(`<h1>${escapeHtml(phone || "")}</h1>`);
  html.push('<div class="metadata">');
  if (session.name) html.push(`<p>Name: ${escapeHtml(session.name)}</p>`);
  if (session.email) html.push(`<p>Email: ${escapeHtml(session.email)}</p>`);
  html.push(`<p>Progress status: ${escapeHtml(session.progress_status || "")}</p>`);
  html.push(
    `<p>Last active: ${escapeHtml(
      session.last_active ? new Date(session.last_active * 1000).toLocaleString() : ""
    )}</p>`
  );
  html.push("</div>");
  if (session.summary) html.push(`<div class="summary">${escapeHtml(session.summary)}</div>`);
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
