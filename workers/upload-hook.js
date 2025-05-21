/**
 * GitHub webhook handler to trigger document sync.
 */
export async function handleUploadHookRequest(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }
    try {
      const payload = await request.json();
      // Optional: implement signature verification using env.GITHUB_WEBHOOK_SECRET
      // TODO: Trigger the doc-sync worker (e.g., via fetch to docs_sync endpoint)
      console.log('Received upload-hook payload', payload);
      return new Response('OK', { status: 200 });
    } catch (err) {
      console.error('Upload-hook error', err);
      return new Response('Internal Error', { status: 500 });
    }
}
