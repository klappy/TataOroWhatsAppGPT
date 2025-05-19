# 🧠 OpenAI Routing & Prompt Behavior

## 🧭 Overview
How the assistant guides the conversation using GPT, structured prompts, and message-state logic.

---

## 🧾 Prompt Strategy

- Lives in `shared/systemPrompt.js`
- Defines tone, service knowledge, and goals
- Includes instructions for:
  - Emoji use
  - Asking one question at a time
  - Hair-specific terminology
  - Summary generation logic

---

## 📥 GPT Request Construction

```js
const messages = [
  { role: "system", content: SYSTEM_PROMPT },
  ...history,
  { role: "user", content: userMessage }
];
```

- Vision inputs (images) may be added with `image_url` blocks
- Assistant is guided to synthesize, not guess

---

## 🧾 Summary Detection

- Assistant is instructed to produce a structured Markdown summary
- Worker detects summary handoff link in assistant reply using `summaryHandoffLinkRegex` (e.g., a wa.me link)
- Triggers downstream logic: send summary email and upsert Shopify customer

---

## ✅ Notes

- GPT failures are caught and logged
- Prompt is versioned for future refinement
