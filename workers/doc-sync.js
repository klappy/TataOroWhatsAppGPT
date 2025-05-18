import { embedText } from '../shared/embeddings.js';
import { chunkText } from '../shared/chunker.js';

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }
    try {
      const { owner, repo, path } = await request.json();
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;
      const mdResponse = await fetch(rawUrl);
      if (!mdResponse.ok) {
        return new Response('Failed to fetch document', { status: mdResponse.status });
      }
      const content = await mdResponse.text();
      const chunks = chunkText(content);
      const embeddings = await embedText(chunks, env.OPENAI_API_KEY);
      for (let i = 0; i < embeddings.length; i++) {
        const key = `${owner}/${repo}/${path}/chunk${i}`;
        await env.DOC_KNOWLEDGE.put(key, JSON.stringify({ chunk: chunks[i], embedding: embeddings[i] }));
      }
      return new Response('Document synced', { status: 200 });
    } catch (err) {
      console.error('Doc-sync error', err);
      return new Response('Internal Error', { status: 500 });
    }
  },
};