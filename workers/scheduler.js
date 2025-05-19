import { sendConsultationEmail } from '../shared/emailer.js';
import { generateOrFetchSummary } from '../shared/summary.js';

async function sendWhatsAppNudge(env, phone) {
  const message = "Hi love! 💛 Just checking in — you were making great progress in your curl consultation! 🌱 Let me know if you're ready to finish or if you have any questions.";
  const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
  const body = new URLSearchParams({
    From: env.TWILIO_WHATSAPP_NUMBER,
    To: phone,
    Body: message,
  });
  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(env.TWILIO_ACCOUNT_SID + ':' + env.TWILIO_AUTH_TOKEN),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
}

export default {
  async scheduled(event, env, ctx) {
    const now = Math.floor(Date.now() / 1000);
    let cursor;
    do {
      const list = await env.CHAT_HISTORY.list({ cursor, limit: 100 });
      cursor = list.cursor;
      for (const key of list.keys) {
        if (!key.name.startsWith('chat_history:')) continue;
        const stored = await env.CHAT_HISTORY.get(key.name);
        if (!stored) continue;
        const session = JSON.parse(stored);
        const lastActive = session.last_active;
        if (session.progress_status === 'midway') {
          if (
            !session.summary_email_sent &&
            now - lastActive > 7200 &&
            (session.name ||
              (session.history &&
                session.history.some(msg =>
                  Array.isArray(msg.content) && msg.content.some(e => e.type === 'image_url')
                )))
          ) {
            const summary = await generateOrFetchSummary({ env, session, phone: key.name.split(':')[1] });
            ctx.waitUntil(
              sendConsultationEmail({
                env,
                phone: key.name.split(':')[1],
                summary,
                history: session.history,
                r2Urls: session.r2Urls || [],
              })
            );
            session.summary_email_sent = true;
            await env.CHAT_HISTORY.put(key.name, JSON.stringify(session), { expirationTtl: 86400 });
          }
          if (!session.nudge_sent && now - lastActive > 7200) {
            ctx.waitUntil(sendWhatsAppNudge(env, key.name.split(':')[1]));
            session.nudge_sent = true;
            await env.CHAT_HISTORY.put(key.name, JSON.stringify(session), { expirationTtl: 86400 });
          }
        }
      }
    } while (cursor);
  },
};