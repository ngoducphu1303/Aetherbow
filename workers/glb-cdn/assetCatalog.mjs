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
