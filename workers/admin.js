import {
  chatHistoryKey,
  mediaPrefix,
  normalizePhoneNumber,
} from '../shared/storageKeys.js';
import { renderAdminSessionHTML, generateOrFetchSummary } from '../shared/summary.js';

export async function handleAdminRequest(request, env) {
    const url = new URL(request.url);
    const base = url.origin;
    const path = url.pathname.replace(/\/+$/, '');
    if (!path.startsWith('/admin')) {
      return new Response('Not Found', { status: 404 });
    }
    const sub = path.slice('/admin'.length) || '/sessions';
    if (request.method === 'GET' && (sub === '' || sub === '/')) {
      return Response.redirect('/admin/sessions');
    }

    if (request.method === 'GET' && sub === '/sessions') {
      const rows = [];
      let cursor;
      do {
        const list = await env.CHAT_HISTORY.list({ cursor, limit: 100 });
        cursor = list.cursor;
        for (const key of list.keys) {
          if (!key.name.endsWith('/history.json')) continue;
          const namespace = key.name.slice(0, -'/history.json'.length);
          const [platform, rawPhone] = namespace.split(':');
          const phone = normalizePhoneNumber(rawPhone);
          const session = await env.CHAT_HISTORY.get(key.name, { type: 'json' });
          if (!session) continue;
          if (!session.history || session.history.length === 0) {
            console.warn('Empty history for session', namespace);
          }
          if (session.progress_status === 'summary-ready' && !session.summary) {
            console.warn('Missing summary for ready session', namespace);
          }
          const rowClass = session.progress_status === 'summary-ready' ? 'ready' : '';
          const viewLink = `/admin/sessions/${platform}:${encodeURIComponent(rawPhone)}`;
          rows.push(`<tr class="${rowClass}"><td>${platform}</td><td>${phone}</td><td>${session.name || ''}</td><td>${session.progress_status || ''}</td><td>${new Date((session.last_active || 0) * 1000).toLocaleString()}</td><td><a href="${viewLink}">view</a></td></tr>`);
        }
      } while (cursor);
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Sessions</title><style>table{border-collapse:collapse;width:100%;font-family:-apple-system,BlinkMacSystemFont,sans-serif}td,th{border:1px solid #ccc;padding:4px}tr.ready{background:#e8f5e9}</style></head><body><h1>Sessions</h1><table><tr><th>Platform</th><th>Phone</th><th>Name</th><th>Status</th><th>Last Active</th><th></th></tr>${rows.join('')}</table></body></html>`;
      return new Response(html, {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' },
      });
    }

    if (sub.startsWith('/sessions/') && request.method === 'GET') {
      const namespace = decodeURIComponent(sub.slice('/sessions/'.length));
      const sessionKey = `${namespace}/history.json`;
      const session = await env.CHAT_HISTORY.get(sessionKey, { type: 'json' });
      if (!session) return new Response('Not Found', { status: 404 });
      const [platform, rawPhone] = namespace.split(':');
      const phone = normalizePhoneNumber(rawPhone);
      const { objects } = await env.MEDIA_BUCKET.list({ prefix: mediaPrefix(platform, phone) });
      const html = renderAdminSessionHTML({ session, mediaObjects: objects || [], phone, baseUrl: base });
      const resetUrl = `/admin/sessions/${encodeURIComponent(namespace)}/reset`;
      const withReset = html.replace('</body>', `<form method="post" action="${resetUrl}"><button type="submit">Reset Session</button></form></body>`);
      return new Response(withReset, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
    }

    if (sub.startsWith('/sessions/') && sub.endsWith('/reset') && request.method === 'POST') {
      const namespace = decodeURIComponent(sub.slice('/sessions/'.length, -('/reset'.length)));
      const sessionKey = `${namespace}/history.json`;
      const [platform, rawPhone] = namespace.split(':');
      const phone = normalizePhoneNumber(rawPhone);
      const { objects } = await env.MEDIA_BUCKET.list({ prefix: mediaPrefix(platform, phone) });
      for (const obj of objects || []) {
        await env.MEDIA_BUCKET.delete(obj.key);
      }
      await env.CHAT_HISTORY.delete(sessionKey);
      return Response.redirect('/admin/sessions');
    }

    if (sub.startsWith('/summary/') && request.method === 'GET') {
      const namespace = decodeURIComponent(sub.slice('/summary/'.length));
      const sessionKey = `${namespace}/history.json`;
      const session = await env.CHAT_HISTORY.get(sessionKey, { type: 'json' });
      if (!session) return new Response('Not Found', { status: 404 });
      const [platform, rawPhone] = namespace.split(':');
      const phone = normalizePhoneNumber(rawPhone);
      const summary = await generateOrFetchSummary({ env, session, phone, baseUrl: base });
      session.summary = summary;
      session.progress_status = 'summary-ready';
      await env.CHAT_HISTORY.put(sessionKey, JSON.stringify(session), { expirationTtl: 86400 });
      return new Response(`<pre>${summary}</pre>`, { headers:{'Content-Type':'text/html;charset=UTF-8'} });
    }

    if (sub === '/docs' && request.method === 'GET') {
      const entries = [];
      let cursor;
      do {
        const list = await env.DOC_KNOWLEDGE.list({ cursor, limit: 100 });
        cursor = list.cursor;
        for (const key of list.keys) { entries.push(`<li>${key.name}</li>`); }
      } while (cursor);
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Docs</title></head><body><h1>Docs</h1><ul>${entries.join('')}</ul></body></html>`;
      return new Response(html, { headers:{'Content-Type':'text/html;charset=UTF-8'} });
    }

    return new Response('Not Found', { status: 404 });
  }
