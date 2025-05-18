/**
 * Builds a prompt by combining document context and message instructions.
 */
export function buildPrompt({ title, chunks }) {
  const header = `Here is the content of ${title}:`;
  return [header, ...chunks].join('\n\n');
}