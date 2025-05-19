# 🧠 Antifragile Strategy: Discover Images from R2 via Phone Prefix

## ✅ Problem Solved

In previous versions, we tracked uploaded WhatsApp photos in KV using `photo_urls[]`. This approach was prone to race conditions when users sent multiple images in rapid succession.

## 💡 Antifragile Approach

Avoid writing to KV entirely — instead, dynamically **list all images from R2** using a path prefix based on the user's phone number.

---

## 📁 File Naming Convention

All image uploads use this key format:

```
whatsapp:+<phone>/<timestamp>-<filename>.jpg
```

📌 Example:

```
whatsapp:+14335551212/1716120082-hair.jpg
```

---

## 🔍 Retrieval Strategy

To fetch all images the user uploaded, list objects using the phone-number prefix:

```js
const prefix = `whatsapp:${phone}/`;
const { objects } = await env.R2.list({ prefix });

const photoUrls = objects.map((obj) => `https://r2.cdn.com/${obj.key}`);
```

These URLs are then included in the final summary without requiring prior tracking.

---

## ✅ Benefits

- 🚫 No KV updates required
- ✅ Resistant to race conditions
- 📦 Full image history is always retrievable
- 🔁 Safe for restarts, resets, or duplicate messages

---

## 🚧 Optional: Filter by Recency

If needed, filter only recent session uploads:

```js
const cutoff = Date.now() - 2 * 60 * 60 * 1000; // past 2 hours
const recent = objects.filter((obj) => obj.uploaded >= cutoff);
```

---

## 📝 Where This Replaces Old Logic

- No need to use `photo_urls[]` in `CHAT_HISTORY`
- Summary generation logic now discovers images dynamically

---

## 📁 Related Docs to Update

- [`kv-state-machine.md`](../architecture/kv-state-machine.md)
- [`007-r2-for-image-relay.md`](../decisions/007-r2-for-image-relay.md)
