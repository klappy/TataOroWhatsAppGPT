# VIBE_PROMPT.md

Build a serverless Cloudflare Worker that acts as a webhook handler for Twilio’s WhatsApp API, integrates with the OpenAI Chat Completion API (GPT-4), and replies intelligently to user messages. This assistant supports Tata Oro’s curl discovery consultation workflow.

## GOAL

The function should:

1. Accept incoming POST requests from Twilio (containing WhatsApp message metadata and body)
2. Parse the message (text or image)
3. Maintain a lightweight memory (short-term) using Cloudflare KV (if available)
4. Send the message to the OpenAI Chat Completion API with a defined system prompt (provided below)
5. Return the assistant’s reply as a TwiML XML response to WhatsApp via Twilio
6. If the conversation reaches a natural end, the assistant should return a formatted summary message that includes:
   - Collected consultation data (goals, history, tone)
   - WhatsApp-safe summary (no emojis)
   - Public image URLs (if present)
   - A WhatsApp handoff link to Tata’s number: `https://wa.me/16895292934?text=...`

## SYSTEM PROMPT (inject this into GPT conversation context)

You are a warm, empathetic, and knowledgeable virtual assistant for Tata Oro, a curly hair specialist, product creator, and curl transformation coach. Your job is to guide potential clients through a personalized curl discovery conversation before they book an appointment. You collect information step by step, help set expectations, analyze any uploaded photos, and prepare a summary for Tata Oro to continue the consultation.

You must:

- Greet the user warmly
- Ask one clear question at a time (start with photo request)
- Ask about their hair history, curl goals, and expectations
- Set realistic expectations (especially about curl recovery)
- Handle both English and Spanish (language detection + response)
- Generate a final summary when ready that can be sent via WhatsApp to Tata
- Do not make bookings directly
- Instead, output a WhatsApp link to forward the summary to Tata: `https://wa.me/16895292934?text=<summary>`

## INPUT

Incoming requests from Twilio Webhook, containing:

- `Body`: user's message text
- `From`: user's phone number
- `MediaContentType{N}` and `MediaUrl{N}` (if media is uploaded)

## OUTPUT

A valid TwiML `<Response>` XML with a `<Message>` block that replies with the assistant's message.

## GPT API

Use GPT-4 with the system prompt and a chat history object stored by `From` phone number (KV optional but preferred). Ensure the assistant maintains memory of the conversation for the session.

## IMAGE HANDLING

If the message includes media, detect and include the image URL in the GPT message (i.e., send the image to GPT-4 Vision). GPT should use that visual input to inform its reply.

## NOTES

- Do not hardcode OpenAI or Twilio credentials; use environment variables.
- Add basic logging for incoming/outgoing data.
- Return CORS headers for debugging or UI testing.
- Keep GPT responses under 750 characters per message unless final summary.
- Use plain text (no emojis) in WhatsApp handoff links to preserve meaning.
