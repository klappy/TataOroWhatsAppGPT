/**
 * Emailer utility for sending consultation summary emails via configured provider.
 */

/**
 * Send a consultation summary email including transcript and image links.
 *
 * @param {object} options
 * @param {object} options.env - Cloudflare Worker environment variables
 * @param {string} options.phone - Client phone number or identifier
 * @param {string} options.summary - Consultation summary text
 * @param {Array} [options.history] - Chat history messages array
 * @param {Array<string>} [options.r2Urls] - List of R2-hosted image URLs
 */
import { renderSummaryHTML } from './summary.js';
import { r2KeyFromUrl } from './r2.js';

export async function sendConsultationEmail({ env, phone, summary, history = [], r2Urls = [] }) {
  const enabled = String(env.EMAIL_ENABLED).toLowerCase() === 'true';
  if (!enabled) {
    return;
  }

  const provider = (env.EMAIL_PROVIDER || '').toLowerCase();
  if (provider !== 'resend') {
    console.warn('Email provider not supported:', provider);
    return;
  }

  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not configured');
    return;
  }

  const subject = `New Curl Consultation – ${phone}`;

  const sessionData = {
    history,
    summary,
    progress_status: 'summary-ready',
    last_active: Math.floor(Date.now() / 1000),
  };

  const mediaObjects = r2Urls.map((u) => ({ key: r2KeyFromUrl(u) || u }));

  const html = renderSummaryHTML({
    session: sessionData,
    mediaObjects,
    phone,
    baseUrl: env.WHATSAPP_BASE_URL,
  });

  const payload = {
    from: env.EMAIL_FROM,
    to: env.EMAIL_TO,
    subject,
    html,
  };

  async function attemptSend() {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to send email: ${res.status} ${text}`);
    }
    return res;
  }

  try {
    await attemptSend();
  } catch (err) {
    console.error('Error sending email, retrying once...', err);
    try {
      await attemptSend();
    } catch (err2) {
      console.error('Retry failed:', err2);
    }
  }
}