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
import { chatHistoryKey, mediaObjectKey, mediaPrefix, normalizePhoneNumber } from "../shared/storageKeys.js";
import { chatCompletion } from '../shared/gpt.js';
import { SYSTEM_PROMPT } from '../shared/systemPrompt.js';
import { sendConsultationEmail } from '../shared/emailer.js';
import { generateOrFetchSummary, extractSummaryFromReply } from '../shared/summary.js';
import { deleteR2Objects, r2KeyFromUrl } from '../shared/r2.js';

export async function handleWhatsAppRequest(request, env, ctx) {
    const url = new URL(request.url);
    const baseUrl = url.origin;
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

    const phone = normalizePhoneNumber(formParams.get('From') || '');
    const hasValidPhone = /^\+\d{6,15}$/.test(phone);
    if (!hasValidPhone) {
      console.warn('Invalid phone number', phone);
    }
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
        const key = mediaObjectKey('whatsapp', phone, `${Date.now()}-${i}.${extension}`);
        const buffer = await twilioResponse.arrayBuffer();
        await env.MEDIA_BUCKET.put(key, buffer, { httpMetadata: { contentType } });
        r2Urls.push(`${baseUrl}/images/${encodeURIComponent(key)}`);
      } catch (err) {
        console.error('Error processing media', err);
      }
    }

    console.log('Incoming message', { from: phone, body, mediaUrls, r2Urls });

    const now = Math.floor(Date.now() / 1000);
    const sessionKey = chatHistoryKey('whatsapp', phone);
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
      const { objects } = await env.MEDIA_BUCKET.list({ prefix: mediaPrefix('whatsapp', phone) });
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
      const summary = await generateOrFetchSummary({ env, session, phone, baseUrl });
      const { objects } = await env.MEDIA_BUCKET.list({ prefix: mediaPrefix('whatsapp', phone) });
      const photoUrls = (objects || []).map(obj => `${baseUrl}/images/${encodeURIComponent(obj.key)}`);
      await sendConsultationEmail({ env, phone, summary, history: session.history, r2Urls: photoUrls });
      session.summary = summary;
      session.summary_email_sent = true;
      session.progress_status = 'summary-ready';
      await env.CHAT_HISTORY.put(sessionKey, JSON.stringify(session), { expirationTtl: 86400 });
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Done! 💌 I’ve sent your consultation summary to Tata by email.</Message></Response>`;
      return new Response(twiml, {
        headers: { 'Content-Type': 'text/xml; charset=UTF-8', 'Access-Control-Allow-Origin': '*' },
      });
    }


    // Construct messages payload for OpenAI
    let prompt = SYSTEM_PROMPT;
    if (SYSTEM_PROMPT.includes('{{USER_PHONE}}')) {
      if (hasValidPhone) {
        prompt = SYSTEM_PROMPT.replaceAll('{{USER_PHONE}}', phone);
      } else {
        console.warn('Skipping phone injection due to invalid number');
      }
    } else {
      console.warn('SYSTEM_PROMPT missing {{USER_PHONE}}');
    }
    const messages = [{ role: 'system', content: prompt }];
    if (session.summary) {
      messages.push({ role: 'assistant', content: session.summary });
    }
    if (session.progress_status === 'summary-ready') {
      const summaryUrl = `${baseUrl}/summary/whatsapp:${phone}`;
      messages.push({
        role: 'assistant',
        content: `You can now send your consultation summary to Tata \ud83d\udc8c:\n${summaryUrl}`,
      });
    }
    messages.push(...session.history);
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

    session.history.push({ role: 'assistant', content: assistantReply });

    // Detect if GPT produced the final summary
    extractSummaryFromReply(assistantReply, session);

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
}
