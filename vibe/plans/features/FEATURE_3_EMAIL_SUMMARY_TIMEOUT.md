# ⏰ Feature: Timeout-Based Email Summary (Lead Capture)

## 🧭 Objective
Send an internal email to Tata if a consultation was started but not completed within 2 hours.

---

## ✅ Trigger Conditions
- `progress_status = "midway"`
- `summary_email_sent = false`
- `now - last_active > 2h`

---

## 📬 Email Content
**To:** Tata or CRM inbox  
**Subject:** `🌀 Partial Curl Consultation – [Client Name or Phone]`  
**Body Includes:**
- Chat summary so far
- Image links
- WhatsApp resume link
- Phone number

---

## 🔁 How It Works
- Cron job or edge scheduler checks conversations hourly
- If criteria met, send summary email
- Mark `summary_email_sent: true` to avoid repeats

---

## 🛡 Safeguards
- Max 1 email per session
- Only send if name or image exists (i.e. user actually engaged)
