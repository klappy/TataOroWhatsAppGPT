# 🔄 Async Flow & Message Lifecycle

## 🧭 Overview
This document outlines the flow of messages from WhatsApp users through the Cloudflare Worker, and how external integrations and background tasks are triggered.

---

## 💬 Message Lifecycle

1. **Incoming Message via Twilio Webhook**
   - Worker receives incoming message via webhook endpoint (e.g., `POST https://wa.tataoro.com/`)
   - User identified by phone number

2. **Pre-Processing**
   - Normalize message
   - Detect commands (e.g., `reset`, `send email`, `email summary`)
     - `reset`, `clear`, `start over`: clear conversation and start fresh (session reset)
     - `send email`, `email summary`: immediately generate or fetch the current summary and send it via email (marks `summary_email_sent`)
       - Only supported when there is conversation history; if none yet, the user is prompted to chat more before emailing.
   - Update `last_active` timestamp in KV

3. **Photo Analysis (if any)**
   - Store image reference in R2
   - Optionally call OpenAI vision model for notes (TBD)

4. **OpenAI GPT Call**
   - Uses current chat history + prompt
   - Response added to KV
   - Summary constructed if conditions are met

5. **Post-Processing**
   - If summary generated:
     - Email is triggered (if not already sent)
     - Shopify customer created
     - WhatsApp handoff link offered
   - Progress status updated

---

## ⏱ Deferred Actions (via Cron or Timers)
- Detect stale `midway` sessions
- Retry failed integrations
- Send gentle nudges

