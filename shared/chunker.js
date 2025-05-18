/**
 * Splits text into chunks of approximately maxTokens tokens.
 * This is a naive implementation using character length estimation.
 */
export function chunkText(text, maxTokens = 500) {
  const approxTokenSize = 4; // rough estimate: one token ~4 characters
  const maxLength = maxTokens * approxTokenSize;
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = start + maxLength;
    if (end >= text.length) {
      chunks.push(text.slice(start));
      break;
    }
    // try to split on whitespace before limit
    let split = text.lastIndexOf(' ', end);
    if (split <= start) split = end;
    chunks.push(text.slice(start, split));
    start = split + 1;
  }
  return chunks;
}