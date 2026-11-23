const notFound = () => Response.json({ error: 'Không tìm thấy bản tải lên.' }, { status: 404 });

export class AssetCatalog {
  constructor(state) {
    this.storage = state.storage;
  }

  async fetch(request) {
    const route = new URL(request.url);
    if (route.pathname === '/versions') {
      const active = (await this.storage.get('active')) ?? {};
      return Response.json(Object.fromEntries(Object.entries(active).map(([path, entry]) => [path, entry.id])));
    }
    if (route.pathname === '/password-admin') {
      if (request.method === 'GET') return Response.json({ uid: (await this.storage.get('password-admin-uid')) ?? null });
      const { uid } = await request.json();
      return this.storage.transaction(async (transaction) => {
        const stored = await transaction.get('password-admin-uid');
        if (stored && stored !== uid) return Response.json({ error: 'Already linked' }, { status: 409 });
        if (!stored) await transaction.put({ 'password-admin-uid': uid });
        return Response.json({ uid });
      });
    }
    if (route.pathname === '/inbox') {
      if (request.method === 'POST') {
        const item = await request.json();
        await this.storage.put({
          [`inbox:${item.chapter}:${item.uploadedAt}:${item.id}`]: item,
        });
        return Response.json(item);
      }
      const prefix = 'inbox:' + route.searchParams.get('chapter') + ':';
      const cursor = route.searchParams.get('cursor');
      const rows = [...await this.storage.list({
        prefix, reverse: true, limit: 51, ...(cursor && { end: cursor }),
      })];
      return Response.json({
        files: rows.slice(0, 50).map(([, value]) => value),
        nextCursor: rows.length > 50 ? rows[49][0] : null,
      });
    }
    if (route.pathname === '/inbox-all' && request.method === 'GET') {
      const rows = [...await this.storage.list({ prefix: 'inbox:', reverse: true, limit: 200 })];
      return Response.json({
        files: rows.map(([, value]) => value),
        nextCursor: null,
      });
    }
    if (route.pathname === '/inbox-upload') {
      if (request.method === 'GET') {
        const session = await this.storage.get('upload:' + route.searchParams.get('id'));
        return session ? Response.json(session) : notFound();
      }
      const candidate = await request.json();
      return this.storage.transaction(async (transaction) => {
        const key = 'upload:' + candidate.id;
        const existing = await transaction.get(key);
        if (existing) return Response.json(existing);
        await transaction.put({ [key]: candidate });
        return Response.json(candidate);
      });
    }
    if (route.pathname === '/inbox-upload/part' && request.method === 'POST') {
      const { id, part, etag } = await request.json();
      if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/.test(id) ||
          !Number.isInteger(part) || part < 1 || part > 20 ||
          typeof etag !== 'string' || !/^[a-f0-9]{32}$/.test(etag)) {
        return Response.json({ error: 'Phần upload không hợp lệ.' }, { status: 400 });
      }
      return this.storage.transaction(async (transaction) => {
        const key = 'upload:' + id;
        const session = await transaction.get(key);
        if (!session) return notFound();
        if (session.completed) return Response.json({ error: 'Phiên upload đã hoàn tất.' }, { status: 409 });
        const parts = { ...(session.parts ?? {}), [part]: etag };
        await transaction.put({ [key]: { ...session, parts } });
        return Response.json({ etag });
      });
    }
    if (route.pathname === '/inbox-upload/finish') {
      const { id } = await request.json();
      const key = 'upload:' + id;
      return this.storage.transaction(async (transaction) => {
        const session = await transaction.get(key);
        if (!session) return notFound();
        if (session.completed) return Response.json(session.completed);
        const { b2Id, kind, parts, ...record } = session;
        const publication = kind === 'stage'
          ? { ['revision:' + id]: record, ['draft:' + record.path]: record }
          : { [`inbox:${record.chapter}:${record.uploadedAt}:${id}`]: record };
        await transaction.put({ [key]: { ...session, completed: record }, ...publication });
        return Response.json(record);
      });
    }
    if (route.pathname === '/entry') {
      const path = route.searchParams.get('path');
      const rows = await this.storage.get(['active', 'previous', 'draft:' + path]);
      const active = rows.get('active') ?? {};
      const previous = rows.get('previous') ?? {};
      return Response.json({
        active: active[path] ?? null,
        previous: previous[path] ?? null,
        draft: rows.get('draft:' + path) ?? null,
        canRollback: Object.hasOwn(previous, path),
      });
    }
    if (route.pathname === '/stage') {
      const revision = await request.json();
      await this.storage.put({ ['revision:' + revision.id]: revision, ['draft:' + revision.path]: revision });
      return Response.json(revision);
    }
    if (route.pathname === '/publish' || route.pathname === '/rollback') {
      const { path, id, expected } = await request.json();
      return this.storage.transaction(async (transaction) => {
        const active = (await transaction.get('active')) ?? {};
        const previous = (await transaction.get('previous')) ?? {};
        if ((active[path]?.id ?? null) !== expected) {
          return Response.json({ error: 'Phiên bản đã đổi. Hãy tải lại thông tin model.' }, { status: 409 });
        }
        let next;
        let draft = (await transaction.get('draft:' + path)) ?? null;
        if (route.pathname === '/publish') {
          next = await transaction.get('revision:' + id);
          if (!next || next.path !== path) return notFound();
          if (next.id === active[path]?.id) {
            return Response.json({ active: next, previous: previous[path] ?? null, draft, canRollback: Object.hasOwn(previous, path) });
          }
        } else {
          if (!Object.hasOwn(previous, path)) return notFound();
          next = previous[path];
        }
        if (route.pathname === '/publish' && draft?.id === id) {
          await transaction.delete('draft:' + path);
          draft = null;
        }
        previous[path] = active[path] ?? null;
        if (next) active[path] = next;
        else delete active[path];
        await transaction.put({ active, previous });
        return Response.json({ active: next ?? null, previous: previous[path], draft, canRollback: true });
      });
    }
    return notFound();
  }
}
