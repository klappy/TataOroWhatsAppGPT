export function r2KeyFromUrl(url) {
  try {
    return decodeURIComponent(new URL(url).pathname.replace('/images/', ''));
  } catch {
    return null;
  }
}

export async function deleteR2Objects(env, keys = []) {
  for (const key of keys) {
    try {
      await env.MEDIA_BUCKET.delete(key);
    } catch (err) {
      console.error('R2 delete error', key, err);
    }
  }
}
