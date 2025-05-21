export function chatHistoryKey(platform, id) {
  return `${platform}:${id}/history.json`;
}
export function chatHistoryPrefix(platform) {
  return `${platform}:`;
}
export function mediaPrefix(platform, id) {
  return `${platform}:${id}/`;
}
export function mediaObjectKey(platform, id, name) {
  return `${mediaPrefix(platform, id)}${name}`;
}
export function docChunkKey(owner, repo, path, index) {
  return `kv/docs/github:${owner}/${repo}/${path}/chunk${index}`;
}
