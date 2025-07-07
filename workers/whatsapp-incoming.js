/**
 * Cloudflare Worker webhook handler for Twilio WhatsApp integration.
 * Accepts incoming POST requests from Twilio, relays messages to OpenAI GPT-4o,
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
import {
  chatHistoryKey,
  mediaObjectKey,
  mediaPrefix,
  normalizePhoneNumber,
} from "../shared/storageKeys.js";
import { getChatCompletion, BOOKSY_FUNCTIONS } from "../shared/gpt.js";
import { SYSTEM_PROMPT } from "../shared/systemPrompt.js";
import { sendConsultationEmail } from "../shared/emailer.js";
import { generateOrFetchSummary } from "../shared/summary.js";
import { deleteR2Objects, r2KeyFromUrl } from "../shared/r2.js";
// Booksy MCP functions removed - GPT now handles service requests naturally

export async function handleWhatsAppRequest(request, env, ctx) {
  const url = new URL(request.url);
  const baseUrl = url.origin;
  // Handle CORS preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const contentType = request.headers.get("content-type") || "";
  let formParams;
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    formParams = new URLSearchParams(text);
  } else {
    return new Response("Unsupported Media Type", { status: 415 });
  }

  const phone = normalizePhoneNumber(formParams.get("From") || "");
  const hasValidPhone = /^\+\d{6,15}$/.test(phone);
  if (!hasValidPhone) {
    console.warn("Invalid phone number", phone);
  }
  const body = formParams.get("Body") || "";
  const numMedia = parseInt(formParams.get("NumMedia") || "0");
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
          Authorization: "Basic " + btoa(env.TWILIO_ACCOUNT_SID + ":" + env.TWILIO_AUTH_TOKEN),
        },
      });
      if (!twilioResponse.ok) {
        console.error("Failed to fetch Twilio media", twilioUrl, await twilioResponse.text());
        continue;
      }
      const contentType = twilioResponse.headers.get("content-type") || "application/octet-stream";
      const typeParts = contentType.split("/");
      const mainType = typeParts[0];
      const extension = typeParts[1] || "bin";
      const key = mediaObjectKey("whatsapp", phone, `${Date.now()}-${i}.${extension}`);
      const buffer = await twilioResponse.arrayBuffer();
      await env.MEDIA_BUCKET.put(key, buffer, { httpMetadata: { contentType } });
      if (mainType === "audio") {
        // Send audio to OpenAI Whisper API for transcription
        const supportedFormat = extension === "ogg" ? "mp3" : extension;
        const transcription = await transcribeAudio(buffer, supportedFormat, env.OPENAI_API_KEY);
        r2Urls.push({
          type: "audio_transcription",
          transcription: transcription,
          original_key: key,
        });
      } else {
        r2Urls.push({
          type: "image_url",
          image_url: { url: `${baseUrl}/images/${encodeURIComponent(key)}` },
        });
      }
    } catch (err) {
      console.error("Error processing media", err);
    }
  }

  console.log("Incoming message", { from: phone, body, mediaUrls, r2Urls });

  const now = Math.floor(Date.now() / 1000);
  const sessionKey = chatHistoryKey("whatsapp", phone);
  // Safely read session data from KV and provide defaults to prevent missing data errors
  const stored = await env.CHAT_HISTORY.get(sessionKey, { type: "json" });
  const sessionData = stored || {};
  const session = {
    history: Array.isArray(sessionData.history) ? sessionData.history : [],
    progress_status: sessionData.progress_status || "started",
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
  if (session.progress_status === "started") {
    if (r2Urls.length > 0) {
      session.progress_status = "photo-received";
    } else if (body) {
      session.progress_status = "midway";
    }
  } else if (session.progress_status === "photo-received" && body) {
    session.progress_status = "midway";
  }

  const incoming = body.trim().toLowerCase();

  // Check for debug mode - enable for session if detected in any message
  if (incoming.includes("debug") || incoming.includes("debugger")) {
    session.debugMode = true;
  }

  // Check for debug disable commands
  if (
    incoming.includes("debug off") ||
    incoming.includes("disable debug") ||
    incoming.includes("no debug")
  ) {
    session.debugMode = false;
  }

  // Check if debug mode is enabled for this session
  const isDebugMode = session.debugMode || false;

  const resetTriggers = ["restart", "reset", "clear", "start over", "new consultation"];
  if (resetTriggers.includes(incoming)) {
    const { objects } = await env.MEDIA_BUCKET.list({ prefix: mediaPrefix("whatsapp", phone) });
    const keys = (objects || []).map((obj) => obj.key);
    await deleteR2Objects(env, keys);
    await env.CHAT_HISTORY.delete(sessionKey);
    const resetMessage = session.debugMode
      ? "No problem! I've cleared our conversation so we can start fresh. 🌱 (Debug mode disabled) What would you like to do next?"
      : "No problem! I've cleared our conversation so we can start fresh. 🌱 What would you like to do next?";
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${resetMessage}</Message></Response>`;
    return new Response(twiml, {
      headers: { "Content-Type": "text/xml; charset=UTF-8", "Access-Control-Allow-Origin": "*" },
    });
  }

  const emailTriggers = ["send email", "email summary"];
  if (emailTriggers.includes(incoming)) {
    if (!session.history || session.history.length === 0) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, I haven't captured any conversation yet to summarize. Let's chat a bit more before sending the email!</Message></Response>`;
      return new Response(twiml, {
        headers: { "Content-Type": "text/xml; charset=UTF-8", "Access-Control-Allow-Origin": "*" },
      });
    }
    const summary = await generateOrFetchSummary({ env, session, phone, baseUrl });
    const { objects } = await env.MEDIA_BUCKET.list({ prefix: mediaPrefix("whatsapp", phone) });
    const photoUrls = (objects || []).map(
      (obj) => `${baseUrl}/images/${encodeURIComponent(obj.key)}`
    );
    await sendConsultationEmail({
      env,
      phone,
      summary,
      history: session.history,
      r2Urls: photoUrls,
    });
    session.summary = summary;
    session.summary_email_sent = true;
    session.progress_status = "summary-ready";
    // Extend session retention to one month
    await env.CHAT_HISTORY.put(sessionKey, JSON.stringify(session), { expirationTtl: 2592000 });
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Done! 💌 I've sent your consultation summary to Tata by email.</Message></Response>`;
    return new Response(twiml, {
      headers: { "Content-Type": "text/xml; charset=UTF-8", "Access-Control-Allow-Origin": "*" },
    });
  }

  // Let GPT handle all service requests naturally - no hardcoded bypass logic needed!

  // Construct messages payload for OpenAI
  let prompt = SYSTEM_PROMPT;
  if (SYSTEM_PROMPT.includes("{{USER_PHONE}}")) {
    if (hasValidPhone) {
      prompt = SYSTEM_PROMPT.replaceAll("{{USER_PHONE}}", encodeURIComponent(phone));
    } else {
      console.warn("Skipping phone injection due to invalid number");
    }
  } else {
    console.warn("SYSTEM_PROMPT missing {{USER_PHONE}}");
  }
  const messages = [{ role: "system", content: prompt }];
  if (session.summary) {
    messages.push({ role: "assistant", content: session.summary });
  }
  if (session.progress_status === "summary-ready") {
    const summaryUrl = `${baseUrl}/summary/whatsapp:${phone}`;
    messages.push({
      role: "assistant",
      content: `You can now send your consultation summary to Tata \ud83d\udc8c:\n${summaryUrl}`,
    });
  }
  messages.push(...session.history);
  if (r2Urls.length > 0) {
    const contentArray = [];
    r2Urls.forEach((item) => {
      if (item.type === "audio_transcription") {
        contentArray.push({ type: "text", text: `Transcribed Audio: ${item.transcription}` });
      } else if (item.type === "image_url") {
        contentArray.push({ type: "image_url", image_url: item.image_url });
      }
    });
    if (body) contentArray.push({ type: "text", text: body });
    messages.push({ role: "user", content: contentArray });
  } else {
    messages.push({ role: "user", content: body });
  }

  // Use enhanced GPT completion with resilient function calling
  let assistantReply;
  let debugInfo = {};

  try {
    const startTime = Date.now();
    const result = await getChatCompletion(messages, env, {
      model: "gpt-4o",
      temperature: 0.7,
      includeFunctions: true, // Enable function calling for service requests
    });
    const endTime = Date.now();

    // Collect debug information
    debugInfo = {
      version: "1.17.0",
      responseTime: `${endTime - startTime}ms`,
      model: "gpt-4o",
      functionsEnabled: true,
      messageCount: messages.length,
      sessionStatus: session.progress_status,
      hasMedia: r2Urls.length > 0,
      functionCalls: result.functionCalls || [],
      errors: result.error ? [result.error] : [],
      fallbackUsed: result.fallback || false,
    };

    // Check for function call result for get_available_appointments
    if (
      result.function_call &&
      result.function_call.name === "get_available_appointments" &&
      result.function_call.result
    ) {
      const appt = result.function_call.result;
      if (appt && appt.available && Array.isArray(appt.slots) && appt.slots.length > 0) {
        // Format soonest available slots
        const slotLines = appt.slots.slice(0, 5).map((slot) => `• ${slot.date} at ${slot.time}`);
        assistantReply = `Here are the soonest available times for "${
          appt.serviceName || "your selected service"
        }":\n\n${slotLines.join(
          "\n"
        )}\n\nTo book, visit [Tata's Booksy page](https://booksy.com/en-us/155582_akro-beauty-by-la-morocha-makeup_hair-salon_134763_orlando/staffer/880999) and search for the service.`;
      } else if (appt && appt.available === false) {
        assistantReply =
          appt.message ||
          `Sorry, I couldn't find any available slots for that service in the next week. Please try again later or check Booksy directly.`;
      } else {
        assistantReply =
          result.content?.trim() || "I'm having trouble processing that request right now.";
      }
    } else {
      assistantReply =
        result.content?.trim() || "I'm having trouble processing that request right now.";
    }
  } catch (error) {
    console.error("GPT completion failed:", error);

    // Collect debug info for errors
    debugInfo = {
      version: "1.17.0",
      responseTime: "ERROR",
      model: "gpt-4o",
      functionsEnabled: true,
      messageCount: messages.length,
      sessionStatus: session.progress_status,
      hasMedia: r2Urls.length > 0,
      functionCalls: [],
      errors: [error.message],
      fallbackUsed: true,
    };

    // Enhanced fallback response (WhatsApp-friendly)
    assistantReply = `Hi there! 😊 I'm Tata's assistant for curly hair!

✂️ **Curly Adventure (First Time)** - $170 (3-4h)
Perfect for discovering your curl pattern!

✂️ **Curly Adventure (Returning)** - $150 (2-3h)  
For clients who know their curls

💆‍♀️ **Consultation Only** - $50 (45min)
Great way to start your journey

🌈 **Color & Cut Package** - $250+ (4-5h)

To book: Visit Tata's Booksy page → Use "Search for service" box → Book your slot! 😊`;
  }

  // Detect assistant-generated summary
  const summaryHeader = "Client Curl Discovery Summary for Tata Oro";
  if (assistantReply.includes(summaryHeader)) {
    session.summary = assistantReply;
    session.progress_status = "summary-ready";
  }

  // Store messages in session history
  if (r2Urls.length > 0) {
    const contentArray = [];
    r2Urls.forEach((item) => {
      if (item.type === "audio_transcription") {
        contentArray.push({ type: "text", text: `Transcribed Audio: ${item.transcription}` });
        contentArray.push({ type: "audio_reference", original_key: item.original_key });
      } else if (item.type === "image_url") {
        contentArray.push({ type: "image_url", image_url: item.image_url });
      }
    });
    if (body) contentArray.push({ type: "text", text: body });
    session.history.push({ role: "user", content: contentArray });
  } else {
    session.history.push({ role: "user", content: body });
  }

  session.history.push({ role: "assistant", content: assistantReply });

  // Save session state with TTL of one month to retain conversations longer
  await env.CHAT_HISTORY.put(sessionKey, JSON.stringify(session), { expirationTtl: 2592000 });

  console.log("Assistant reply", assistantReply);

  // Respond with TwiML, escaping XML special characters
  function escapeXml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  const escapedReply = escapeXml(assistantReply);

  // Send debug information as separate message if debug mode is enabled
  if (isDebugMode) {
    const debugModeStatus = incoming.includes("debug")
      ? "ENABLED this message"
      : "ENABLED for session";
    const debugOutput = `🔧 DEBUG MODE: ${debugModeStatus}
• Version: ${debugInfo.version}
• Response Time: ${debugInfo.responseTime}
• Model: ${debugInfo.model}
• Messages: ${debugInfo.messageCount}
• Session: ${debugInfo.sessionStatus}
• Media: ${debugInfo.hasMedia ? "Yes" : "No"}
• Functions: ${
      debugInfo.functionCalls.length > 0
        ? debugInfo.functionCalls.map((f) => f.name).join(", ")
        : "None called"
    }
• Errors: ${debugInfo.errors.length > 0 ? debugInfo.errors.join("; ") : "None"}
• Fallback: ${debugInfo.fallbackUsed ? "Yes" : "No"}

💡 Send "debug off" to disable`;

    const escapedDebugOutput = escapeXml(debugOutput);
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapedReply}</Message><Message>${escapedDebugOutput}</Message></Response>`;
    return new Response(twiml, {
      headers: { "Content-Type": "text/xml; charset=UTF-8", "Access-Control-Allow-Origin": "*" },
    });
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapedReply}</Message></Response>`;
  return new Response(twiml, {
    headers: { "Content-Type": "text/xml; charset=UTF-8", "Access-Control-Allow-Origin": "*" },
  });
}

/**
 * Function to transcribe audio using OpenAI Whisper API
 * @param {ArrayBuffer} audioBuffer - The audio data buffer
 * @param {string} format - The format of the audio file
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<string>} - The transcribed text
 */
async function transcribeAudio(audioBuffer, format, apiKey) {
  try {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([audioBuffer], { type: `audio/${format}` }),
      `audio.${format}`
    );
    formData.append("model", "whisper-1");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      console.error("Failed to transcribe audio", await response.text());
      return "Unable to transcribe audio due to an API error.";
    }

    const result = await response.json();
    return result.text || "Audio transcribed but no text was detected.";
  } catch (error) {
    console.error("Error transcribing audio", error);
    return "Error occurred while transcribing audio.";
  }
}
