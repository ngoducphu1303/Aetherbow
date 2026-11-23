import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { ArrowLeft, Box, Check, CloudUpload, Eye, LogOut, RotateCcw, Search, ShieldCheck } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import manifest from '../../scripts/glb-manifest.json';
import AssetInboxPanel from './AssetInboxPanel';
import { api, MAX_BYTES, message, previewUrl, primary, secondary, uploadGlb } from './assetAdminApi';

const Preview = lazy(() => import('./AssetAdminPreview'));
const categories = ['Chương 1', 'Chương 2', 'Khác'] as const;
type Category = typeof categories[number];

type Revision = { path: string; id: string; size: number; uploadedAt: string };
type Entry = { active: Revision | null; previous: Revision | null; draft: Revision | null; canRollback: boolean };

export default function AssetAdminPage() {
  const [session, setSession] = useState<'checking' | 'guest' | 'denied' | 'ready'>('checking');
  const [mode, setMode] = useState<'replace' | 'new'>(() => new URLSearchParams(window.location.search).get('tab') === 'new' ? 'new' : 'replace');
  const [inboxBusy, setInboxBusy] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [sessionError, setSessionError] = useState('');
  const [category, setCategory] = useState<Category>('Chương 2');
  const [search, setSearch] = useState('');
  const [path, setPath] = useState('');
  const [entry, setEntry] = useState<Entry | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Revision | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let listening = true;
    let sequence = 0;
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      const request = ++sequence;
      setUser(null);
      setSessionError('');
      if (!nextUser) { setSession('guest'); return; }
      setSession('checking');
      void api(nextUser, 'session').then(() => {
        if (listening && request === sequence) {
          setUser(nextUser);
          setSession('ready');
        }
      }).catch((cause) => {
        if (listening && request === sequence) {
          setSessionError(message(cause));
          setSession('denied');
        }
      });
    });
    return () => { listening = false; unsubscribe(); };
  }, []);

  const choices = useMemo(() => manifest.files
    .filter((item) => item.runtime)
    .map((item) => ({ ...item, path: item.path.slice('public'.length) }))
    .filter((item) => {
      const folder = item.path.split('/')[2];
      return (category === 'Khác' ? !categories.includes(folder as Category) : folder === category)
        && item.path.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'));
    }), [category, search]);

  useEffect(() => {
    if (!path || !user) return;
    const controller = new AbortController();
    void api<Entry>(user, 'entry', { path, signal: controller.signal }).then((current) => {
      if (!controller.signal.aborted) {
        setEntry(current);
        setStage(current.draft);
      }
    })
      .catch((cause) => { if (!controller.signal.aborted) setError(message(cause)); });
    return () => controller.abort();
  }, [path, user]);

  const select = (next: string) => {
    setPath(next);
    setEntry(null);
    setFile(null);
    setStage(null);
    setPreview(null);
    setError('');
    setNotice('');
  };

  const upload = async () => {
    if (!user || !file || !entry || busy) return;
    if (!/\.glb$/i.test(file.name) || file.size < 24 || file.size > MAX_BYTES) {
      setError('Chọn tệp .glb hợp lệ, tối đa 96 MB.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    setProgress(0);
    setPreview(null);
    try {
      const uploaded = await uploadGlb<Revision>(user, 'upload', { path }, file, setProgress);
      setStage(uploaded);
      setNotice('Đã tải lên bản nháp. Bạn có thể xem trước rồi áp dụng.');
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const changeVersion = async (action: 'publish' | 'rollback') => {
    if (!user || !entry || busy || (action === 'publish' && !stage)) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const updated = await api<Entry>(user, action, {
        path,
        body: { expected: entry.active?.id ?? null, ...(action === 'publish' && {id: stage?.id}) },
      });
      setEntry(updated);
      setStage(updated.draft);
      setPreview(null);
      setFile(null);
      setNotice(action === 'publish' ? 'Đã áp dụng. Người chơi sẽ thấy bản mới khi mở lại game.' : 'Đã khôi phục phiên bản trước.');
    } catch (cause) {
      setError(message(cause));
      void api<Entry>(user, 'entry', { path }).then(setEntry).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="h-dvh overflow-y-auto bg-[#080d19] px-4 pb-10 text-slate-100 sm:px-8">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 border-b border-slate-800 py-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-300/10 text-amber-300"><Box size={22}/></span>
          <div>
            <p className="text-xs font-semibold text-amber-200">Aetherbow</p>
            <h1 className="text-xl font-bold tracking-tight">Quản trị mô hình 3D</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a className={secondary} href="/"><ArrowLeft size={16}/> Về game</a>
          {session === 'ready' && <button className={secondary} disabled={busy || inboxBusy} onClick={() => void signOut(auth)}><LogOut size={16}/> Đăng xuất</button>}
        </div>
      </header>

      {session === 'ready' && (
        <nav aria-label="Quản lý asset" className="mx-auto mt-5 flex max-w-6xl flex-wrap gap-2">
          <button type="button" disabled={busy || inboxBusy} aria-pressed={mode === 'new'} className={mode === 'new' ? primary : secondary}
            onClick={() => setMode('new')}>Tải asset mới</button>
          <button type="button" disabled={busy || inboxBusy} aria-pressed={mode === 'replace'} className={mode === 'replace' ? primary : secondary}
            onClick={() => setMode('replace')}>Thay model đã tích hợp</button>
        </nav>
      )}

      {session !== 'ready' ? (
        <section className="mx-auto mt-16 max-w-md space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-7">
          <ShieldCheck className="text-amber-300" size={29}/>
          <h2 className="text-lg font-bold">Đăng nhập quản trị</h2>
          {session === 'checking' ? <p role="status" className="text-sm text-slate-300">Đang kiểm tra quyền truy cập…</p> : (
            <>
              <p className="text-sm leading-6 text-slate-300">Đăng nhập bằng tài khoản Google được cấp quyền quản lý model Aetherbow.</p>
              <button className={primary} onClick={() => {
                setSessionError('');
                void signInWithPopup(auth, googleProvider).catch((cause) => setSessionError(message(cause)));
              }}>Đăng nhập Google</button>
              {sessionError && <p role="alert" className="text-sm text-rose-300">{sessionError}</p>}
            </>
          )}
        </section>
      ) : mode === 'new' && user ? (
        <AssetInboxPanel user={user} onBusyChange={setInboxBusy} />
      ) : (
        <div className="mx-auto mt-6 grid max-w-6xl gap-4 lg:grid-cols-[minmax(260px,340px)_1fr]">
          <section className="self-start rounded-2xl border border-slate-800 bg-slate-900/85 p-4" aria-label="Danh mục model">
            <div className="mb-3 flex flex-wrap gap-1">
              {categories.map((group) => (
                <button key={group} type="button" disabled={busy} aria-pressed={group === category}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 ${group === category ? 'bg-amber-300 text-slate-950' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
                  onClick={() => { setCategory(group); select(''); }}>{group}</button>
              ))}
            </div>
            <label className="mb-3 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-400">
              <Search size={16}/><input className="w-full bg-transparent text-sm text-slate-100 outline-none" aria-label="Tìm model"
                placeholder="Tìm tên hoặc đường dẫn" value={search} onChange={(e) => setSearch(e.target.value)}/>
            </label>
            <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
              {choices.map((item) => (
                <li key={item.path}>
                  <button type="button" disabled={busy} aria-pressed={path === item.path}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm disabled:opacity-50 ${path === item.path ? 'bg-slate-700 text-amber-200' : 'hover:bg-slate-800'}`}
                    onClick={() => select(item.path)}>
                    <span className="block break-words font-semibold">{item.path.split('/').at(-1)}</span>
                    <span className="block text-xs text-slate-400">{item.path.split('/').slice(3, -1).join(' / ') || 'Model'}</span>
                  </button>
                </li>
              ))}
            </ul>
            {choices.length === 0 && <p className="py-3 text-center text-sm text-slate-400">Chưa tìm thấy model.</p>}
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/85 p-5">
            {!path ? <p className="text-sm text-slate-300">Chọn model cần thay từ danh mục.</p> : (
              <>
                <div>
                  <h2 className="break-words text-lg font-bold">{path.split('/').at(-1)}</h2>
                  <p className="break-words text-xs text-slate-400">{path}</p>
                </div>
                {entry
                  ? <p className="text-sm text-slate-300">Đang dùng {entry.active ? `bản ngày ${new Date(entry.active.uploadedAt).toLocaleString('vi-VN')}` : 'bản gốc trên CDN'}</p>
                  : !error && <p role="status" className="text-sm text-slate-300">Đang lấy phiên bản…</p>}
                <div className="space-y-3 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-4">
                  <label className="block text-sm font-semibold" htmlFor="asset-admin-file">Tệp GLB thay thế</label>
                  <input key={path} id="asset-admin-file" type="file" accept=".glb,model/gltf-binary" disabled={busy}
                    className="max-w-full text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-slate-100"
                    onChange={(e) => { setFile(e.target.files?.[0] ?? null); setNotice(''); setError(''); }}/>
                  <p className="text-xs text-slate-400">GLB 2.0, tối đa 96 MB</p>
                  <button className={primary} disabled={!file || !entry || busy} onClick={() => void upload()}><CloudUpload size={16}/> Tải lên bản nháp</button>
                  {progress !== null && <div role="status" className="text-xs text-slate-300">{progress < 100 ? `Đang tải lên ${progress}%` : 'Đang xác minh tệp…'}<progress className="block w-full" max={100} value={progress}/></div>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className={secondary} disabled={!entry || busy} onClick={() => setPreview(preview ? null : previewUrl(path, stage ?? entry?.active))}><Eye size={16}/>{preview ? 'Đóng xem thử' : stage ? 'Xem thử bản nháp' : 'Xem model đang dùng'}</button>
                  {stage && <button className={primary} disabled={busy} onClick={() => void changeVersion('publish')}><Check size={16}/> Áp dụng</button>}
                  {entry?.canRollback && <button className={secondary} disabled={busy} onClick={() => void changeVersion('rollback')}><RotateCcw size={16}/> Quay lại bản trước</button>}
                </div>
                {preview && <Suspense fallback={<div role="status" className="text-sm text-slate-300">Đang nạp trình xem…</div>}><Preview key={preview} url={preview}/></Suspense>}
                {notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}
                {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
