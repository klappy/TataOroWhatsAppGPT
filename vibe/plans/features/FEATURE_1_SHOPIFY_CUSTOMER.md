# 🛍 Feature: Create or Update Shopify Customer

## 🧭 Objective
Automatically create or update a Shopify customer record when a consultation begins or reaches certain milestones, enabling future marketing, sales, or service automation via Shopify.

---

## ✅ Trigger Points
- 📸 When user sends a photo
- 🧑 When name is collected
- 📝 When goals or history are shared
- 🧾 When consultation summary is generated

---

## 📬 Shopify API Integration

**Endpoint**  
`POST https://{store}.myshopify.com/admin/api/2023-04/customers.json`

**Required Fields**
```json
{
  "customer": {
    "first_name": "Chris",
    "phone": "+14332817433",
    "email": "chris@example.com",
    "tags": "whatsapp,consultation-lead",
    "note": "Uploaded 2 photos. Link: https://assistant.tataoro.com/chat?phone=+14332817433"
  }
}
```

**Authentication**
- Create a private Shopify app
- Enable `write_customers` scope
- Use the Admin API token as `SHOPIFY_API_TOKEN`

---

## 🏷 Tag Examples
- `whatsapp`
- `curl-lead`
- `incomplete-consultation`
- `chat-photo-uploaded`
- `summary-complete`

---

## 🔒 Privacy & Safety
- Only store data client provides (e.g. name, phone, email)
- Redact or mask partial data if unknown

---

## 🔁 Duplicate Protection
Use Shopify’s native de-duping via phone/email, or fetch + update if already exists.
