import { chatCompletion } from './gpt.js';

/**
 * Generate or reuse stored consultation summary.
 * @param {object} options
 * @param {object} options.env
 * @param {object} options.session
 * @param {string} options.phone
 * @returns {Promise<string>}
 */
export async function generateOrFetchSummary({ env, session, phone }) {
  if (session.summary) {
    return session.summary;
  }
  const messages = [
    { role: 'system', content: 'Please provide a concise summary of the following consultation:' },
    ...session.history.map(msg => ({
      role: msg.role,
      content:
        typeof msg.content === 'string'
          ? msg.content
          : msg.content
              .map(entry =>
                entry.type === 'text'
                  ? entry.text
                  : entry.type === 'image_url' && entry.image_url?.url
                  ? entry.image_url.url
                  : ''
              )
              .join(' '),
    })),
  ];
  const summary = await chatCompletion(messages, env.OPENAI_API_KEY);
  return summary;
}