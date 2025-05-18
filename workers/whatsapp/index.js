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
import { chatCompletion } from '../../shared/gpt.js';

export default {
  async fetch(request, env) {
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

    // Load conversation history from KV
    const historyKey = `chat_history:${from}`;
    const stored = await env.CHAT_HISTORY.get(historyKey);
    const history = stored ? JSON.parse(stored) : [];

    // System prompt for GPT
    const SYSTEM_PROMPT = `You are a warm, empathetic, and knowledgeable virtual assistant for Tata Oro, a curly hair specialist, product creator, and curl transformation coach. Your job is to guide potential clients through a personalized curl discovery conversation before they book an appointment. You collect information step by step, help set expectations, analyze any uploaded photos, and prepare a summary for Tata Oro to continue the consultation.

You must:

- Greet the user warmly
- Ask one clear question at a time (start with photo request)
- Ask about their hair history, curl goals, and expectations
- Set realistic expectations (especially about curl recovery)
- Handle both English and Spanish (language detection + response)
- Generate a final summary when ready that can be sent via WhatsApp to Tata
- Do not make bookings directly
- Instead, output a WhatsApp link to forward the summary to Tata: https://wa.me/16895292934?text=<summary>

Keep your responses under 750 characters per message unless generating the final summary, and use plain text (no emojis) in WhatsApp handoff links to preserve meaning.`;

    // Construct messages payload for OpenAI
    const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...history];
    if (r2Urls.length > 0) {
      const contentArray = r2Urls.map(url => ({ type: 'image_url', image_url: { url } }));
      if (body) contentArray.push({ type: 'text', text: body });
      messages.push({ role: 'user', content: contentArray });
    } else {
      messages.push({ role: 'user', content: body });
    }

    // Call OpenAI Chat Completion API
    const assistantReply = await chatCompletion(messages, env.OPENAI_API_KEY);

    // Update KV with new messages (short-term memory)
    if (r2Urls.length > 0) {
      const contentArray = r2Urls.map(url => ({ type: 'image_url', image_url: { url } }));
      if (body) contentArray.push({ type: 'text', text: body });
      history.push({ role: 'user', content: contentArray });
    } else {
      history.push({ role: 'user', content: body });
    }
    history.push({ role: 'assistant', content: assistantReply });
    // Keep history for 24 hours
    await env.CHAT_HISTORY.put(historyKey, JSON.stringify(history), { expirationTtl: 86400 });

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
