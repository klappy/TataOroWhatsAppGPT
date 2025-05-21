import { chatHistoryPrefix, chatHistoryKey, mediaPrefix, normalizePhoneNumber } from '../shared/storageKeys.js';
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
        const list = await env.CHAT_HISTORY.list({ prefix: chatHistoryPrefix('whatsapp'), cursor, limit: 100 });
        cursor = list.cursor;
        for (const key of list.keys) {
          const phone = normalizePhoneNumber(key.name.slice(chatHistoryPrefix('whatsapp').length));
          const session = await env.CHAT_HISTORY.get(key.name, { type: 'json' });
          if (!session) continue;
          if ((!session.history || session.history.length === 0)) {
            console.warn('Empty history for session', phone);
          }
          if (session.progress_status === 'summary-ready' && !session.summary) {
            console.warn('Missing summary for ready session', phone);
          }
          const rowClass = session.progress_status === 'summary-ready' ? 'ready' : '';
          rows.push(`<tr class="${rowClass}"><td>${phone}</td><td>${session.name || ''}</td><td>${session.progress_status || ''}</td><td>${new Date((session.last_active||0)*1000).toLocaleString()}</td><td><a href="/admin/sessions/${encodeURIComponent(phone)}">view</a></td></tr>`);
        }
      } while (cursor);
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Sessions</title><style>table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:4px}tr.ready{background:#e8f5e9}</style></head><body><h1>Sessions</h1><table><tr><th>Phone</th><th>Name</th><th>Status</th><th>Last Active</th><th></th></tr>${rows.join('')}</table></body></html>`;
      return new Response(html, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
    }

    if (sub.startsWith('/sessions/') && request.method === 'GET') {
      const phone = normalizePhoneNumber(decodeURIComponent(sub.slice('/sessions/'.length)));
      const key = chatHistoryKey('whatsapp', phone);
      const session = await env.CHAT_HISTORY.get(key, { type: 'json' });
      if (!session) return new Response('Not Found', { status: 404 });
      const { objects } = await env.MEDIA_BUCKET.list({ prefix: mediaPrefix('whatsapp', phone) });
      const html = renderAdminSessionHTML({ session, mediaObjects: objects || [], phone, baseUrl: base });
      const withReset = html.replace('</body>', `<form method="post" action="/admin/sessions/${encodeURIComponent(phone)}/reset"><button type="submit">Reset Session</button></form></body>`);
      return new Response(withReset, { headers:{'Content-Type':'text/html;charset=UTF-8'} });
    }

    if (sub.startsWith('/sessions/') && sub.endsWith('/reset') && request.method === 'POST') {
      const phone = normalizePhoneNumber(decodeURIComponent(sub.slice('/sessions/'.length, -('/reset'.length))));
      const key = chatHistoryKey('whatsapp', phone);
      const { objects } = await env.MEDIA_BUCKET.list({ prefix: mediaPrefix('whatsapp', phone) });
      for (const obj of objects || []) {
        await env.MEDIA_BUCKET.delete(obj.key);
      }
      await env.CHAT_HISTORY.delete(key);
      return Response.redirect('/admin/sessions');
    }

    if (sub.startsWith('/summary/') && request.method === 'GET') {
      const phone = normalizePhoneNumber(decodeURIComponent(sub.slice('/summary/'.length)));
      const key = chatHistoryKey('whatsapp', phone);
      const session = await env.CHAT_HISTORY.get(key, { type: 'json' });
      if (!session) return new Response('Not Found', { status: 404 });
      const summary = await generateOrFetchSummary({ env, session, phone, baseUrl: base });
      session.summary = summary;
      session.progress_status = 'summary-ready';
      await env.CHAT_HISTORY.put(key, JSON.stringify(session), { expirationTtl: 86400 });
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
