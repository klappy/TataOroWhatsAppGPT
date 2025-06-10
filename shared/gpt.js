/**
 * General GPT call abstraction using OpenAI Chat Completion API.
 */
export async function chatCompletion(messages, apiKey, model = "gpt-4o", temperature = 0.7) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature }),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}
