// Public images worker
// Do not handle /images/* elsewhere
export async function handleImagesRequest(request, env) {
    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405 });
    }
    const url = new URL(request.url);
    const key = decodeURIComponent(url.pathname.slice('/images/'.length));
    if (!key) return new Response('Not Found', { status: 404 });
    const object = await env.MEDIA_BUCKET.get(key, { type: 'stream' });
    if (!object) return new Response('Not Found', { status: 404 });
    const headers = {};
    if (object.httpMetadata?.contentType) {
      headers['Content-Type'] = object.httpMetadata.contentType;
    }
    return new Response(object.body, { headers });
}
