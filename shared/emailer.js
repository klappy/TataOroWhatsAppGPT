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

  const escapeHtml = text =>
    String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  let html = `<h1>${escapeHtml(subject)}</h1>`;
  html += `<h2>Summary</h2><pre>${escapeHtml(summary)}</pre>`;

  if (r2Urls.length > 0) {
    html += '<h2>Images</h2><ul>';
    for (const url of r2Urls) {
      html += `<li><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></li>`;
    }
    html += '</ul>';
  }

  if (history.length > 0) {
    html += '<h2>Transcript</h2>';
    for (const msg of history) {
      if (msg.role === 'user') {
        if (typeof msg.content === 'string') {
          html += `<p><strong>User:</strong> ${escapeHtml(msg.content)}</p>`;
        } else if (Array.isArray(msg.content)) {
          const parts = msg.content.map(entry => {
            if (entry.type === 'text' && entry.text) {
              return escapeHtml(entry.text);
            }
            if (entry.type === 'image_url' && entry.image_url?.url) {
              return `<a href="${escapeHtml(entry.image_url.url)}">${escapeHtml(entry.image_url.url)}</a>`;
            }
            return '';
          });
          html += `<p><strong>User:</strong> ${parts.join(' ')}</p>`;
        }
      } else if (msg.role === 'assistant') {
        html += `<p><strong>Assistant:</strong> ${escapeHtml(msg.content)}</p>`;
      }
    }
  }

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