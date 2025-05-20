/**
 * Cloudflare Worker webhook handler for Twilio WhatsApp integration.
 * Accepts incoming POST requests from Twilio, relays messages to OpenAI GPT-4o-mini,
 * and responds with TwiML XML back to WhatsApp.
 *
 * Environment Variables:
 *   OPENAI_API_KEY     - OpenAI API key
 *   TWILIO_ACCOUNT_SID - Twilio Account SID for authenticated media downloads
 *   TWILIO_AUTH_TOKEN  - Twilio Auth Token for authenticated media downloads
 * KV Namespace Bindings:
 *   CHAT_HISTORY       - Cloudflare KV namespace for conversation history
 * R2 Bucket Bindings:
 *   MEDIA_BUCKET       - Cloudflare R2 bucket for media storage
 */
import { chatCompletion } from '../shared/gpt.js';
import { SYSTEM_PROMPT } from '../shared/systemPrompt.js';
import { sendConsultationEmail } from '../shared/emailer.js';
import { upsertShopifyCustomer } from '../shared/shopify.js';
import { generateOrFetchSummary } from '../shared/summary.js';
import { deleteR2Objects, r2KeyFromUrl } from '../shared/r2.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const baseUrl = url.origin;
    // Serve media from R2 on GET /images/<key>
    if (request.method === 'GET' && url.pathname.startsWith('/images/')) {
      const key = decodeURIComponent(url.pathname.slice('/images/'.length));
      const object = await env.MEDIA_BUCKET.get(key, { type: 'stream' });
      if (!object) {
        return new Response('Not Found', { status: 404 });
      }
      const headers = {};
      if (object.httpMetadata?.contentType) {
        headers['Content-Type'] = object.httpMetadata.contentType;
      }
      return new Response(object.body, { headers });
    }

    if (request.method === 'GET' && url.pathname.startsWith('/summary/')) {
      const rawId = decodeURIComponent(url.pathname.slice('/summary/'.length));
      let phone = rawId;
      try {
        const decoded = atob(rawId);
        if (decoded.startsWith('whatsapp:+')) phone = decoded;
      } catch {}
      const sessionKey = `chat_history:${phone}`;
      const stored = await env.CHAT_HISTORY.get(sessionKey, { type: 'json' });
      if (!stored) {
        return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain;charset=UTF-8' } });
      }
      const session = stored;
      const { objects: objs } = await env.MEDIA_BUCKET.list({ prefix: `${phone}/` });
      const htmlParts = [];
      htmlParts.push('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Consultation Summary</title><style>body{font-family:sans-serif;max-width:600px;margin:auto;padding:1em}.message{margin-bottom:1em}.user{color:#0066cc}.assistant{color:#008000}.metadata{font-size:.9em;color:#666}img{max-width:100%;display:block;margin:0.5em 0}</style></head><body><h1>Consultation Summary</h1>');
      htmlParts.push(`<div class="metadata"><p>Progress status: ${escapeXml(session.progress_status)}</p><p>Last active: ${escapeXml(new Date(session.last_active * 1000).toLocaleString())}</p>${session.summary ? `<p>Summary: ${escapeXml(session.summary)}</p>` : ''}</div>`);
      htmlParts.push('<div class="messages">');
      for (const msg of session.history || []) {
        htmlParts.push(`<div class="message ${msg.role}"><strong>${escapeXml(msg.role)}:</strong> `);
        if (typeof msg.content === 'string') {
          htmlParts.push(escapeXml(msg.content));
        } else if (Array.isArray(msg.content)) {
          for (const entry of msg.content) {
            if (entry.type === 'text' && entry.text) {
              htmlParts.push(escapeXml(entry.text));
            }
            if (entry.type === 'image_url' && entry.image_url?.url) {
              htmlParts.push(`<img src="${escapeXml(entry.image_url.url)}">`);
            }
          }
        }
        htmlParts.push('</div>');
      }
      htmlParts.push('</div>');
      if (objs?.length) {
        htmlParts.push('<h2>Uploaded Images</h2>');
        for (const obj of objs) {
          htmlParts.push(`<img src="${baseUrl}/images/${encodeURIComponent(obj.key)}">`);
        }
      }
      htmlParts.push('</body></html>');
      return new Response(htmlParts.join(''), { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
    }
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const contentType = request.headers.get('content-type') || '';
    let formParams;
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await request.text();
      formParams = new URLSearchParams(text);
    } else {
      return new Response('Unsupported Media Type', { status: 415 });
    }

    const from = formParams.get('From') || '';
    const body = formParams.get('Body') || '';
    const numMedia = parseInt(formParams.get('NumMedia') || '0');
    const mediaUrls = [];
    for (let i = 0; i < numMedia; i++) {
      const url = formParams.get(`MediaUrl${i}`);
      if (url) mediaUrls.push(url);
    }

    // Download Twilio media via Basic Auth, upload to R2, and build public URLs
    const r2Urls = [];
    for (const [i, twilioUrl] of mediaUrls.entries()) {
      try {
        const twilioResponse = await fetch(twilioUrl, {
          headers: {
            Authorization: 'Basic ' + btoa(env.TWILIO_ACCOUNT_SID + ':' + env.TWILIO_AUTH_TOKEN),
          },
        });
        if (!twilioResponse.ok) {
          console.error('Failed to fetch Twilio media', twilioUrl, await twilioResponse.text());
          continue;
        }
        const contentType = twilioResponse.headers.get('content-type') || 'application/octet-stream';
        const extension = contentType.split('/')[1] || 'bin';
        const key = `${from}/${Date.now()}-${i}.${extension}`;
        const buffer = await twilioResponse.arrayBuffer();
        await env.MEDIA_BUCKET.put(key, buffer, { httpMetadata: { contentType } });
        r2Urls.push(`${baseUrl}/images/${encodeURIComponent(key)}`);
      } catch (err) {
        console.error('Error processing media', err);
      }
    }

    console.log('Incoming message', { from, body, mediaUrls, r2Urls });

    const now = Math.floor(Date.now() / 1000);
    const sessionKey = `chat_history:${from}`;
    // Safely read session data from KV and provide defaults to prevent missing data errors
    const stored = await env.CHAT_HISTORY.get(sessionKey, { type: 'json' });
    const sessionData = stored || {};
    const session = {
      history: Array.isArray(sessionData.history) ? sessionData.history : [],
      progress_status: sessionData.progress_status || 'started',
      summary_email_sent: sessionData.summary_email_sent || false,
      nudge_sent: sessionData.nudge_sent || false,
      r2Urls: Array.isArray(sessionData.r2Urls) ? sessionData.r2Urls : [],
      ...sessionData,
    };
    session.last_active = now;
    if (!Array.isArray(session.r2Urls)) {
      session.r2Urls = [];
    }
    if (r2Urls.length > 0) {
      session.r2Urls.push(...r2Urls);
    }

    // Update progress status based on incoming content
    if (session.progress_status === 'started') {
      if (r2Urls.length > 0) {
        session.progress_status = 'photo-received';
      } else if (body) {
        session.progress_status = 'midway';
      }
    } else if (session.progress_status === 'photo-received' && body) {
      session.progress_status = 'midway';
    }

    const incoming = body.trim().toLowerCase();
    const resetTriggers = ['reset', 'clear', 'start over', 'new consultation'];
    if (resetTriggers.includes(incoming)) {
      const { objects } = await env.MEDIA_BUCKET.list({ prefix: `${from}/` });
      const keys = (objects || []).map(obj => obj.key);
      await deleteR2Objects(env, keys);
      await env.CHAT_HISTORY.delete(sessionKey);
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>No problem! I’ve cleared our conversation so we can start fresh. 🌱 What would you like to do next?</Message></Response>`;
      return new Response(twiml, {
        headers: { 'Content-Type': 'text/xml; charset=UTF-8', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const emailTriggers = ['send email', 'email summary'];
    if (emailTriggers.includes(incoming)) {
      if (!session.history || session.history.length === 0) {
        const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, I haven’t captured any conversation yet to summarize. Let’s chat a bit more before sending the email!</Message></Response>`;
        return new Response(twiml, {
          headers: { 'Content-Type': 'text/xml; charset=UTF-8', 'Access-Control-Allow-Origin': '*' },
        });
      }
      const summary = await generateOrFetchSummary({ env, session, phone: from, baseUrl });
      const { objects } = await env.MEDIA_BUCKET.list({ prefix: `${from}/` });
      const photoUrls = (objects || []).map(obj => `${baseUrl}/images/${encodeURIComponent(obj.key)}`);
      await sendConsultationEmail({ env, phone: from, summary, history: session.history, r2Urls: photoUrls });
      session.summary = summary;
      session.summary_email_sent = true;
      await env.CHAT_HISTORY.put(sessionKey, JSON.stringify(session), { expirationTtl: 86400 });
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Done! 💌 I’ve sent your consultation summary to Tata by email.</Message></Response>`;
      return new Response(twiml, {
        headers: { 'Content-Type': 'text/xml; charset=UTF-8', 'Access-Control-Allow-Origin': '*' },
      });
    }


    // Construct messages payload for OpenAI
    const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...session.history];
    if (r2Urls.length > 0) {
      const contentArray = r2Urls.map(url => ({ type: 'image_url', image_url: { url } }));
      if (body) contentArray.push({ type: 'text', text: body });
      messages.push({ role: 'user', content: contentArray });
    } else {
      messages.push({ role: 'user', content: body });
    }

    // Call OpenAI Chat Completion API
    let assistantReply = await chatCompletion(messages, env.OPENAI_API_KEY);

    // Store messages in session history
    if (r2Urls.length > 0) {
      const contentArray = r2Urls.map(url => ({ type: 'image_url', image_url: { url } }));
      if (body) contentArray.push({ type: 'text', text: body });
      session.history.push({ role: 'user', content: contentArray });
    } else {
      session.history.push({ role: 'user', content: body });
    }
    const summaryHandoffLinkRegex = /https?:\/\/wa\.me\/\d+\?text=/;
    if (summaryHandoffLinkRegex.test(assistantReply)) {
      assistantReply = await generateOrFetchSummary({ env, session, phone: from, baseUrl });
      session.summary = assistantReply;
      session.progress_status = 'summary-ready';
      const { objects } = await env.MEDIA_BUCKET.list({ prefix: `${from}/` });
      const photoUrls = (objects || []).map(obj => `${baseUrl}/images/${encodeURIComponent(obj.key)}`);
      ctx.waitUntil(
        sendConsultationEmail({ env, phone: from, summary: assistantReply, history: [...session.history, { role: 'assistant', content: assistantReply }], r2Urls: photoUrls })
      );
      ctx.waitUntil(
        upsertShopifyCustomer({
          env,
          firstName: session.name,
          phone: from,
          email: session.email,
          tags: 'whatsapp,consultation-lead,summary-complete',
          note: 'Consultation summary generated',
        })
      );
    }

    session.history.push({ role: 'assistant', content: assistantReply });

    // Save session state with TTL
    await env.CHAT_HISTORY.put(sessionKey, JSON.stringify(session), { expirationTtl: 86400 });

    console.log('Assistant reply', assistantReply);

    // Respond with TwiML, escaping XML special characters
    function escapeXml(unsafe) {
      return unsafe.replace(/&/g, '&amp;')
                   .replace(/</g, '&lt;')
                   .replace(/>/g, '&gt;')
                   .replace(/"/g, '&quot;')
                   .replace(/'/g, '&apos;');
    }
    const escapedReply = escapeXml(assistantReply);
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapedReply}</Message></Response>`;
    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml; charset=UTF-8', 'Access-Control-Allow-Origin': '*' },
    });
  },
};
