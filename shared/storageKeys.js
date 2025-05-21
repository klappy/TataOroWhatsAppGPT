const debug = globalThis.DEBUG ? (...args) => console.warn(...args) : () => {};

export function normalizePhoneNumber(input) {
  if (typeof input !== 'string') {
    debug('normalizePhoneNumber: input not string', input);
    throw new Error('invalid phone');
  }
  let phone = input.trim();
  while (phone.toLowerCase().startsWith('whatsapp:')) {
    phone = phone.slice('whatsapp:'.length);
  }
  if (!/^\+\d+$/.test(phone)) {
    debug('normalizePhoneNumber: invalid format', input);
    throw new Error('invalid phone');
  }
  return phone;
}

export function chatHistoryKey(platform, id) {
  if (!platform || !id) {
    debug('chatHistoryKey: missing parameters', platform, id);
    throw new Error('invalid key inputs');
  }
  const normalized = platform === 'whatsapp' ? normalizePhoneNumber(id) : id;
  return `${platform}:${normalized}/history.json`;
}
export function chatHistoryPrefix(platform) {
  return `${platform}:`;
}
export function mediaPrefix(platform, id) {
  if (!platform || !id) {
    debug('mediaPrefix: missing parameters', platform, id);
    throw new Error('invalid prefix inputs');
  }
  const normalized = platform === 'whatsapp' ? normalizePhoneNumber(id) : id;
  return `${platform}:${normalized}/`;
}
export function mediaObjectKey(platform, id, name) {
  return `${mediaPrefix(platform, id)}${name}`;
}
export function docChunkKey(owner, repo, path, index) {
  return `kv/docs/github:${owner}/${repo}/${path}/chunk${index}`;
}
