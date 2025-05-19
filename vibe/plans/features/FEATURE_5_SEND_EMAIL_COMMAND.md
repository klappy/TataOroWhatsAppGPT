# 📬 Feature: Manual Trigger for Email Summary via User Command

## 🧭 Objective
Allow the user to explicitly trigger the email summary to be sent immediately by typing a specific message such as:  
**"send email"** or **"email summary"**

---

## ✅ Trigger Conditions
- User sends message matching: `"send email"` or `"email summary"`
- Message is normalized (trim + lowercase)
- Conversation must have a valid summary or sufficient partial progress (e.g. name, goals, or images)

---

## 🛠 Implementation

### 1. Command Detection in WhatsApp Worker
```js
const command = message.Body.trim().toLowerCase();
if (["send email", "email summary"].includes(command)) {
  // Check if summary exists or generate partial summary
  const summary = await generateOrFetchSummary(phone);
  await sendEmail({ to: TATA_EMAIL, subject, html: summary });
  return new TwiMLResponse("Done! 💌 I’ve sent your consultation summary to Tata by email.");
}
```

### 2. Constraints
- Only allow once per session (optional)
- Log or mark `summary_email_sent = true` in KV

---

## 🛡 Safeguards
- Don’t attempt email if there’s no progress or summary data
- Avoid GPT call on this message

---

## 🔁 Benefits
- Enables user to control when their info is forwarded
- Works as a safety net if they think it didn’t send
- Helps Tata capture strong leads early
