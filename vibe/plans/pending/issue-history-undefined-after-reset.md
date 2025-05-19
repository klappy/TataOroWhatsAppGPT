# 🐛 Issue: `history is not defined` After Reset

## ❗️Summary

After a user sends a "reset" message, the next incoming message crashes the Worker with:

```
ReferenceError: history is not defined
```

---

## 🔍 Root Cause

The `reset` command deletes the entire chat session from KV (`CHAT_HISTORY:<phone>`), but the subsequent GPT logic assumes `history` (i.e., `messages`) exists.

---

## ✅ Antifragile Resolution

### Instead of requiring reset to write a default structure, **all session reads should be tolerant of missing data**:

```js
const session = (await KV.get(chatKey, { type: "json" })) || {};
const history = Array.isArray(session.messages) ? session.messages : [];
const progress = session.progress_status || "started";
```

This way, even if `reset` deletes the session entirely, your logic will default safely and continue functioning.

---

## 🧠 Future Prevention Strategy

### 1. All reads must assume KV may return `null` or malformed data

- Avoid destructuring undefined
- Use safe defaults

### 2. Helper Function (Recommended)

Create a utility like:

```js
function getSafeSession(data) {
  return {
    messages: Array.isArray(data?.messages) ? data.messages : [],
    progress_status: data?.progress_status || "started",
    photo_urls: Array.isArray(data?.photo_urls) ? data.photo_urls : [],
    ...data,
  };
}
```

---

## 📁 Doc Needs Updated

- [`docs/architecture/kv-state-machine.md`](kv-state-machine.md)  
  ➤ Update to emphasize defensive reads instead of requiring strict structure on new/reset/writes

---

## 🏷 Tags

`cf-worker` · `reset-session` · `kv-defaults` · `ReferenceError` · `gpt`
