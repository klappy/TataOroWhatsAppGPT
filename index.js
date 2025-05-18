/**
 * Cloudflare Worker webhook handler for Twilio WhatsApp integration.
 * Accepts incoming POST requests from Twilio, relays messages to OpenAI GPT-4o-mini,
 * and responds with TwiML XML back to WhatsApp.
 *
 * Environment Variables:
 *   OPENAI_API_KEY   - OpenAI API key
 * KV Namespace Bindings:
 *   CHAT_HISTORY     - Cloudflare KV namespace for conversation history
 */
export default {
  async fetch(request, env) {
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

    console.log('Incoming message', { from, body, mediaUrls });

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
    if (mediaUrls.length > 0) {
      const contentArray = mediaUrls.map(url => ({
        type: 'image_url',
        image_url: { url },
      }));
      if (body) {
        contentArray.push({ type: 'text', text: body });
      }
      messages.push({ role: 'user', content: contentArray });
    } else {
      messages.push({ role: 'user', content: body });
    }

    // Call OpenAI Chat Completion API
    const openaiApiKey = env.OPENAI_API_KEY;
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages, temperature: 0.7 }),
    });
    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('OpenAI API error', error);
      return new Response('OpenAI API error', { status: 500 });
    }
    const openaiData = await openaiResponse.json();
    const assistantReply = openaiData.choices?.[0]?.message?.content?.trim() || '';

    // Update KV with new messages (short-term memory)
    if (mediaUrls.length > 0) {
      const contentArray = mediaUrls.map(url => ({
        type: 'image_url',
        image_url: { url },
      }));
      if (body) {
        contentArray.push({ type: 'text', text: body });
      }
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
