export const CHAT_PREFIX = 'kv/chat/';
export function chatHistoryKey(platform, id) {
  return `${CHAT_PREFIX}${platform}:${id}/history`;
}
export function chatHistoryPrefix(platform) {
  return `${CHAT_PREFIX}${platform}:`;
}
export function mediaPrefix(platform, id) {
  return `r2/media/${platform}:${id}/`;
}
export function mediaObjectKey(platform, id, name) {
  return `${mediaPrefix(platform, id)}${name}`;
}
export function docChunkKey(owner, repo, path, index) {
  return `kv/docs/github:${owner}/${repo}/${path}/chunk${index}`;
}
