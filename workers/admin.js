export default {
  async fetch(request, env) {
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
        const list = await env.CHAT_HISTORY.list({ prefix: 'chat_history:', cursor, limit: 100 });
        cursor = list.cursor;
        for (const key of list.keys) {
          const phone = key.name.slice('chat_history:'.length);
          const session = await env.CHAT_HISTORY.get(key.name, { type: 'json' });
          if (!session) continue;
          rows.push(`<tr><td>${phone}</td><td>${session.progress_status || ''}</td><td>${new Date((session.last_active||0)*1000).toLocaleString()}</td><td><a href="/admin/sessions/${encodeURIComponent(phone)}">view</a></td></tr>`);
        }
      } while (cursor);
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Sessions</title><style>table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px}</style></head><body><h1>Sessions</h1><table><tr><th>Phone</th><th>Status</th><th>Last Active</th><th></th></tr>${rows.join('')}</table></body></html>`;
      return new Response(html, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
    }

    if (sub.startsWith('/sessions/') && request.method === 'GET') {
      const phone = decodeURIComponent(sub.slice('/sessions/'.length));
      const key = `chat_history:${phone}`;
      const session = await env.CHAT_HISTORY.get(key, { type: 'json' });
      if (!session) return new Response('Not Found', { status: 404 });
      const { objects } = await env.MEDIA_BUCKET.list({ prefix: `${phone}/` });
      const photos = (objects||[]).map(o => `<img src="${base}/images/${encodeURIComponent(o.key)}" style="max-width:100%">`).join('');
      const messages = (session.history||[]).map(m => `<div><strong>${m.role}:</strong> ${typeof m.content==='string'?m.content:m.content.map(e=>e.type==='text'?e.text:`<img src='${e.image_url.url}' style='max-width:100%'>`).join(' ')}</div>`).join('');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${phone}</title></head><body><h1>${phone}</h1><p>Status: ${session.progress_status}</p><form method="post" action="/admin/sessions/${encodeURIComponent(phone)}/reset"><button type="submit">Reset Session</button></form><div>${messages}</div><div>${photos}</div></body></html>`;
      return new Response(html, { headers:{'Content-Type':'text/html;charset=UTF-8'} });
    }

    if (sub.startsWith('/sessions/') && sub.endsWith('/reset') && request.method === 'POST') {
      const phone = decodeURIComponent(sub.slice('/sessions/'.length, -('/reset'.length)));
      const key = `chat_history:${phone}`;
      const { objects } = await env.MEDIA_BUCKET.list({ prefix: `${phone}/` });
      for (const obj of objects || []) {
        await env.MEDIA_BUCKET.delete(obj.key);
      }
      await env.CHAT_HISTORY.delete(key);
      return Response.redirect('/admin/sessions');
    }

    if (sub.startsWith('/summary/') && request.method === 'GET') {
      const phone = decodeURIComponent(sub.slice('/summary/'.length));
      const key = `chat_history:${phone}`;
      const session = await env.CHAT_HISTORY.get(key, { type: 'json' });
      if (!session) return new Response('Not Found', { status: 404 });
      const summary = await (await import('../shared/summary.js')).generateOrFetchSummary({ env, session, phone, baseUrl: base });
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
};
