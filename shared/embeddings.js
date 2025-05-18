/**
 * Handles OpenAI text embedding using text-embedding-ada-002 model.
 */
export async function embedText(inputs, apiKey, model = 'text-embedding-ada-002') {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, input: inputs }),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI Embeddings API error: ${error}`);
  }
  const data = await response.json();
  return data.data.map(item => item.embedding);
}