# 🧠 KV State Machine – Session Structure

## 🧭 Purpose

Standardize how consultation sessions are stored and referenced in Cloudflare KV to support lead tracking, progress status, and retries.

---

## 🗂 Key Namespace: `CHAT_HISTORY:<phone>`

```json
{
  "history": [...],
  "name": "Chris",
  "progress_status": "midway",
  "email_status": "pending",
  "shopify_status": "sent",
  "nudge_sent": false,
  "summary_email_sent": false,
  "summary": "...",
  "last_active": 1716155900
}
```

---

## 🧩 Field Descriptions

| Field                | Description                                                      |
| -------------------- | ---------------------------------------------------------------- |
| `history`            | Array of chat messages                                           |
| `name`               | User-provided name (if captured)                                 |
| `progress_status`    | Enum tracking state (`started`, `midway`, `summary-ready`, etc.) |
| `email_status`       | Email summary send status (`pending`, `sent`, `failed`)          |
| `shopify_status`     | Shopify customer upsert status (`pending`, `sent`, `failed`)     |
| `nudge_sent`         | Boolean flag for WhatsApp nudge                                  |
| `summary_email_sent` | Boolean flag for summary email                                   |
| `summary`            | Generated summary string or placeholder                          |
| `last_active`        | Epoch timestamp for timeout logic                                |

---

## ✅ Best Practices

- Always update `last_active` on inbound message
- Only update `*_status` when integration confirmed
- Use atomic `put` / `get` for each session
- Reads should defensively handle missing or malformed session data (absence of KV entry is expected); use safe defaults (e.g., empty `history` array, default `progress_status` to "started").
- Do not persist photo URLs in KV; dynamically discover images from R2 using a prefix listing (see image-discovery-from-r2.md).
