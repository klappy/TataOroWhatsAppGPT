import { chatCompletion } from './gpt.js';

/**
 * Generate or reuse stored consultation summary, including dynamic image listing from R2.
 * @param {object} options
 * @param {object} options.env - Worker environment bindings (including MEDIA_BUCKET, OPENAI_API_KEY)
 * @param {object} options.session - Session data with history and cached summary
 * @param {string} options.phone - User phone identifier used as R2 prefix
 * @param {string} [options.baseUrl] - Optional base URL for image proxy endpoint (e.g., https://wa.tataoro.com)
 * @returns {Promise<string>}
 */
export async function generateOrFetchSummary({ env, session, phone, baseUrl }) {
  if (session.summary) {
    return session.summary;
  }
  const prefix = `${phone}/`;
  const list = await env.MEDIA_BUCKET.list({ prefix });
  const photoUrls = (list.objects || []).map(obj => {
    const encoded = encodeURIComponent(obj.key);
    return baseUrl
      ? `${baseUrl}/images/${encoded}`
      : `images/${encoded}`;
  });
  const messages = [
    { role: 'system', content: 'Please provide a concise summary of the following consultation:' },
    ...(photoUrls.length > 0
      ? [{ role: 'system', content: `Photos Provided: ${photoUrls.join(' | ')}` }]
      : []),
    ...session.history.map(msg => ({
      role: msg.role,
      content:
        typeof msg.content === 'string'
          ? msg.content
          : msg.content
              .map(entry => {
                if (entry.type === 'text' && entry.text) return entry.text;
                if (entry.type === 'image_url' && entry.image_url?.url) return entry.image_url.url;
                return '';
              })
              .join(' '),
    })),
  ];
  const summary = await chatCompletion(messages, env.OPENAI_API_KEY);
  return summary;
}