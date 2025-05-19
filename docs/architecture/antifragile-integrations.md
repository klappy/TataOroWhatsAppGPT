# 🛡 Antifragile Integrations Design Guidelines

## 🧭 Purpose

This document outlines core principles and implementation strategies to ensure Tata Oro's WhatsApp assistant remains **resilient and fault-tolerant**, even when dependent on external services like Resend, Shopify, or Twilio.

---

## 🎯 Principles

### 1. ✅ Never let external API failures break the user flow

- Use `try/catch` around all external calls
- Always return a graceful message to the user
- Mark external failures as `pending` for retry

### 2. 📊 Use KV status flags to track integration state and actions

Each session in KV should include:

```json
{
  "email_status": "pending" | "sent" | "failed",
  "shopify_status": "pending" | "sent" | "failed",
  "nudge_sent": true | false,
  "summary_email_sent": true | false,
  "last_active": 1716155800
}
```

These status fields prevent double-sending, support retries, and allow timeout-based logic.

### 3. ⏱ Implement Timeout Detection & Scheduled Checks

Use Cloudflare Cron Triggers or edge functions to:

- Scan for `"progress_status": "midway"` and no activity for >2h
- Retry failed emails or Shopify entries
- Trigger nudges to inactive users

### 4. 🔁 Queue or Retry Failed Jobs

Record failed requests by marking status flags (e.g., `email_status`, `shopify_status`) in your session metadata or enqueue payloads in KV/D1/R2, and retry them using a scheduled background worker (e.g., a cron-triggered scheduler).

---

## 🧰 External Service Integration Pattern

### Template for Antifragile External Calls

```js
try {
  const result = await callExternalService(...);
  await KV.put("email_status", "sent");
} catch (err) {
  console.error("[EmailFail]", err.message);
  await KV.put("email_status", "failed");
  // fallback: mark for retry or notify internal team
}
```

### Email, Shopify, and Twilio wrappers should:

- Return `{ success: false, error }` if failed
- Not throw unhandled exceptions
- Log with session metadata (phone, step, reason)

---

## 🛠 Suggested Module Placement

| Function                          | File                   |
| --------------------------------- | ---------------------- |
| Email Logic                       | `shared/emailer.js`    |
| Shopify Customer                  | `shared/shopify.js`    |
| Session Summary                   | `shared/summary.js`    |
| Scheduler Worker (retry & nudges) | `workers/scheduler.js` |

---

## 💬 Graceful Degradation: User-Facing Messaging

When an integration fails, say:

> “All set! 💛 We’ll make sure Tata receives your info shortly. If you don’t hear back, feel free to reply here and we’ll try again.”

---

## ✅ Summary

Your code should:

- **Catch failures** 🛑
- **Log them clearly** 📝
- **Retry intelligently** 🔁
- **Degrade gracefully** 💬
- **Track state in KV** 📊

This ensures your assistant remains helpful, even when external services don’t cooperate.
