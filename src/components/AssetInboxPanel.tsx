import { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { CloudUpload, Copy, ExternalLink, FolderOpen } from 'lucide-react';
import assetGroups from '../../scripts/glb-inbox-groups.json';
import { CHAPTERS } from '../data/chaptersData';
import { api, MAX_BYTES, message, previewUrl, primary, secondary, uploadAdminGlb } from './assetAdminApi';

type Group = keyof typeof assetGroups;
type Asset = { id: string; name: string; chapter: number; path: string; size: number; group: Group };
type AssetPage = { files: Asset[]; nextCursor: string | null };

const selectClass = 'block min-h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 disabled:opacity-50';
const sizeLabel = (size: number) => (size / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' MB';

function handoffText(chapter: number, files: Asset[]) {
  return [
    `Tích hợp các model GLB sau cho Chương ${chapter} của Aetherbow.`,
    '',
    ...files.flatMap((file) => [
      `- ${assetGroups[file.group]} · ${file.name} (${file.size} byte)`,
      `  ${previewUrl(file.path)}`,
    ]),
  ].join('\n');
}

export default function AssetInboxPanel({ user, onBusyChange }: { user: User; onBusyChange: (busy: boolean) => void }) {
  const [chapter, setChapter] = useState(() => {
    const initial = Number(new URLSearchParams(window.location.search).get('chapter'));
    return CHAPTERS.some(({id}) => id === initial) ? initial : 3;
  });
  const [group, setGroup] = useState<Group>('other');
  const [selection, setSelection] = useState<File[]>([]);
  const [files, setFiles] = useState<Asset[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; percent: number; name: string } | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [manualCopy, setManualCopy] = useState('');
  const picker = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setFiles([]);
    setCursor(null);
    setError('');
    setNotice('');
    setManualCopy('');
    setLoading(true);
    void api<AssetPage>(user, 'inbox', { query: { chapter: String(chapter) }, signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) { setFiles(result.files); setCursor(result.nextCursor); }
      }).catch((cause) => {
        if (!controller.signal.aborted) setError(message(cause));
      }).finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [chapter, user]);

  const loadMore = async () => {
    if (!cursor || loading) return;
    setLoading(true);
    setError('');
    try {
      const result = await api<AssetPage>(user, 'inbox', { query: { chapter: String(chapter), cursor } });
      setFiles((current) => [...current, ...result.files.filter((file) => !current.some(({id}) => id === file.id))]);
      setCursor(result.nextCursor);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setLoading(false);
    }
  };

  const upload = async () => {
    if (busy || selection.length === 0) return;
    const invalid = selection.find((file) => {
      const name = file.name.trim().normalize('NFC');
      return !/\.glb$/i.test(name) || name.length <= 4 || name.length > 120 || file.size < 24 || file.size > MAX_BYTES;
    });
    if (invalid) {
      setError(`Kiểm tra tệp ${invalid.name}. Chỉ nhận GLB tối đa 120 MB và tên tối đa 120 ký tự.`);
      return;
    }

    setBusy(true);
    onBusyChange(true);
    setError('');
    setNotice('');
    setManualCopy('');
    const failed: { file: File; reason: string }[] = [];
    let completed = 0;
    try {
      for (const [index, file] of selection.entries()) {
        const update = (percent: number) => setProgress({ current: index + 1, total: selection.length, percent, name: file.name });
        update(0);
        try {
          const saved = await uploadAdminGlb<Asset>(user, 'inbox-upload', {
            chapter: String(chapter), group, name: file.name,
          }, file, update);
          setFiles((current) => [saved, ...current]);
          completed += 1;
        } catch (cause) {
          failed.push({ file, reason: message(cause) });
        }
      }
      setSelection(failed.map(({file}) => file));
      if (picker.current) picker.current.value = '';
      if (completed) setNotice(`Đã lưu ${completed} tệp cho Chương ${chapter}.`);
      if (failed.length) setError(failed.map(({file, reason}) => file.name + ' · ' + reason).join('\n'));
    } finally {
      setProgress(null);
      setBusy(false);
      onBusyChange(false);
    }
  };

  const copy = async (text: string, status: string) => {
    setError('');
    try {
      await navigator.clipboard.writeText(text);
      setManualCopy('');
      setNotice(status);
    } catch {
      setManualCopy(text);
      setNotice('Chọn và sao chép văn bản bên dưới.');
    }
  };

  return (
    <div className="mx-auto mt-6 grid max-w-6xl gap-4 lg:grid-cols-[minmax(270px,360px)_1fr]">
      <section className="self-start space-y-4 rounded-2xl border border-slate-800 bg-slate-900/85 p-5" aria-label="Tải asset mới">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold"><CloudUpload className="text-amber-300" size={20}/> Tải asset mới</h2>
          <p className="mt-1 text-sm leading-6 text-slate-300">Lưu tệp theo chương rồi gửi danh sách đường dẫn cho AI tích hợp.</p>
        </div>

        <label className="block space-y-1 text-sm font-semibold">
          <span>Chương</span>
          <select className={selectClass} value={chapter} disabled={busy || loading} onChange={(e) => setChapter(Number(e.target.value))}>
            {CHAPTERS.map(({id, name}) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        <label className="block space-y-1 text-sm font-semibold">
          <span>Nhóm asset</span>
          <select className={selectClass} value={group} disabled={busy} onChange={(e) => setGroup(e.target.value as Group)}>
            {Object.entries(assetGroups).map(([key, title]) => <option key={key} value={key}>{title}</option>)}
          </select>
        </label>
        <div className="space-y-2 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-3">
          <label className="block text-sm font-semibold" htmlFor="asset-inbox-files">Tệp GLB</label>
          <input ref={picker} id="asset-inbox-files" type="file" multiple accept=".glb,model/gltf-binary" disabled={busy}
            className="max-w-full text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-slate-100"
            onChange={(e) => { setSelection(Array.from(e.target.files ?? [])); setError(''); setNotice(''); }}/>
          <p className="text-xs text-slate-400">GLB 2.0, tối đa 120 MB mỗi tệp.</p>
          {selection.length > 0 && (
            <ul className="max-h-28 overflow-y-auto text-xs text-slate-300">
              {selection.map((file, index) => <li className="truncate py-0.5" key={file.name + index}>{file.name}</li>)}
            </ul>
          )}
        </div>
        <button type="button" className={primary} disabled={busy || loading || !selection.length} onClick={() => void upload()}>
          <CloudUpload size={16}/> {selection.length ? `Tải lên ${selection.length} tệp` : 'Tải lên'}
        </button>
        {progress && (
          <div role="status" className="space-y-1 text-xs text-slate-300">
            <p className="break-words">{progress.current}/{progress.total} · {progress.name} · {progress.percent < 100 ? `${progress.percent}%` : 'Đang lưu vào kho…'}</p>
            <progress className="block w-full" max={100} value={progress.percent}/>
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/85 p-5" aria-label="Kho asset theo chương">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold"><FolderOpen size={19} className="text-amber-300"/> Kho asset Chương {chapter}</h2>
          <button type="button" className={secondary} disabled={!files.length || busy} onClick={() => void copy(
            handoffText(chapter, files), 'Đã sao chép danh sách để gửi cho AI.',
          )}><Copy size={16}/> {cursor ? 'Sao chép danh sách đang hiện' : 'Sao chép danh sách cho AI'}</button>
        </header>

        {notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}
        {error && <p role="alert" className="whitespace-pre-line break-words text-sm text-rose-300">{error}</p>}
        {manualCopy && <textarea aria-label="Văn bản để sao chép" readOnly value={manualCopy} rows={6}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm" onFocus={(e) => e.target.select()}/>}
        {loading && !files.length ? <p role="status" className="text-sm text-slate-300">Đang lấy danh sách…</p> : (
          !files.length && <p className="text-sm text-slate-400">Chưa có asset mới cho chương này.</p>
        )}
        <ul className="divide-y divide-slate-800">
          {files.map((file) => {
            const url = previewUrl(file.path);
            return (
              <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold">{file.name}</p>
                  <p className="text-xs text-slate-400">{assetGroups[file.group]} · {sizeLabel(file.size)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={secondary} onClick={() => void copy(url, 'Đã sao chép link CDN.')}><Copy size={15}/> Sao chép link</button>
                  <a className={secondary} href={url} rel="noopener noreferrer" target="_blank"><ExternalLink size={15}/> Tải tệp</a>
                </div>
              </li>
            );
          })}
        </ul>
        {cursor && <button type="button" className={secondary} disabled={busy || loading} onClick={() => void loadMore()}>Tải thêm</button>}
      </section>
    </div>
  );
}
