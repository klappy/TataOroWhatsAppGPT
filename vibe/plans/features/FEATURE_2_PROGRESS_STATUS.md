# 📈 Feature: Track Consultation Progress Status

## 🧭 Objective
Add a `progress_status` field to the consultation record in KV so the assistant can:
- Know how far the user has progressed
- Trigger nudges or lead preservation emails intelligently

---

## 🎯 Status Values
- `started` → conversation opened
- `photo-received` → at least 1 photo uploaded
- `midway` → name, goals, or texture received
- `summary-ready` → summary shown
- `complete` → user clicked WhatsApp handoff link

---

## 🧩 Where to Save
In `CHAT_HISTORY:<phone>`, update object:
```json
{
  "progress_status": "midway",
  "last_active": 1716155800,
  ...
}
```

---

## 🛠 How to Use It
- Emails and nudges only trigger if `progress_status = "midway"` and no activity for X hours
- Summary is not sent if already marked `complete`
- Easily supports analytics and conversion funnel review
