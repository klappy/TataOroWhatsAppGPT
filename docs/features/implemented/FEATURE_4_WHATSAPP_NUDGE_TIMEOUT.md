# 🔔 Feature: Timeout-Based Nudging via WhatsApp

## 🧭 Objective
Send a friendly follow-up message to the client if they stop responding before completing the consultation.

---

## ✅ Trigger Conditions
- `progress_status = "midway"`
- `nudge_sent = false`
- `now - last_active > 2h`

---

## 💬 Message Example
```
Hi love! 💛 Just checking in — you were making great progress in your curl consultation! 🌱 Let me know if you're ready to finish or if you have any questions.
```

---

## 🔁 Implementation Notes
- Use Twilio Programmable Messaging API
- Store `nudge_sent: true` in KV once sent
- Only send once per session

---

## 🛡 Safety
- Respect rate limits
- Avoid repeat or late-night sends (respect time windows)
