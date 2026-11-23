import { mkdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import manifest from './glb-manifest.json' with { type: 'json' };
import inboxGroups from './glb-inbox-groups.json' with { type: 'json' };
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const WORKSPACE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CDN_BASE = (process.env.VITE_GLB_CDN_BASE_URL || manifest.cdnBaseUrl).replace(/\/?$/, '/');

function parseArgs(argv) {
  const options = { chapter: null, json: false, downloadDir: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--download') {
      const dir = argv[i + 1];
      if (!dir || dir.startsWith('--')) throw new Error('Thiếu đường dẫn thư mục sau --download.');
      options.downloadDir = dir;
      i += 1;
    } else if (/^(?:[1-9]|1[0-2])$/.test(arg)) {
      options.chapter = Number(arg);
    } else if (arg === '--all') {
      options.chapter = null;
    } else if (arg === '-h' || arg === '--help') {
      console.log('Cách dùng: node scripts/fetch-glb-inbox.mjs [chapter 1..12 | --all] [--json] [--download <dir>]');
      process.exit(0);
    } else {
      throw new Error(`Tham số không hợp lệ: ${arg}`);
    }
  }
  return options;
}

function toCdnUrl(assetPath) {
  const encoded = assetPath.slice(1).split('/').map(encodeURIComponent).join('/');
  return new URL(encoded, CDN_BASE).href;
}

async function fetchFromWorker(chapter) {
  const files = [];
  let cursor = null;
  for (let page = 0; page < 20; page += 1) {
    const url = new URL('__asset-inbox', CDN_BASE);
    if (chapter !== null) url.searchParams.set('chapter', String(chapter));
    if (cursor) url.searchParams.set('cursor', cursor);
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (response.status === 404) {
      return { ok: false, reason: 'not-deployed' };
    }
    if (!response.ok) {
      return { ok: false, reason: `http-${response.status}` };
    }
    const payload = await response.json();
    const batch = Array.isArray(payload.files) ? payload.files : [];
    for (const item of batch) {
      if (!item || typeof item.path !== 'string') continue;
      files.push({
        id: item.id,
        name: item.name,
        chapter: Number(item.chapter),
        group: item.group,
        groupLabel: inboxGroups[item.group] ?? item.group,
        path: item.path,
        size: Number(item.size),
        uploadedAt: item.uploadedAt ?? null,
        url: item.url || toCdnUrl(item.path),
      });
    }
    if (!payload.nextCursor || chapter === null) break;
    cursor = payload.nextCursor;
  }
  return { ok: true, source: 'worker', files };
}

function readFirestoreValue(field) {
  if (!field || typeof field !== 'object') return undefined;
  if ('stringValue' in field) return field.stringValue;
  if ('integerValue' in field) return Number(field.integerValue);
  if ('doubleValue' in field) return Number(field.doubleValue);
  if ('booleanValue' in field) return Boolean(field.booleanValue);
  return undefined;
}

async function fetchFromFirestore(chapter) {
  const projectId = firebaseConfig.projectId;
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  if (!projectId) return { ok: false, reason: 'missing-config' };

  const endpoint = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(databaseId)}/documents:runQuery`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'asset_inbox' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'isPublic' },
            op: 'EQUAL',
            value: { booleanValue: true },
          },
        },
        limit: 500,
      },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    return { ok: false, reason: `http-${response.status}` };
  }
  const rows = await response.json();
  const files = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const fields = row?.document?.fields;
    if (!fields) continue;
    const itemChapter = readFirestoreValue(fields.chapter);
    if (chapter !== null && itemChapter !== chapter) continue;
    const assetPath = readFirestoreValue(fields.path);
    const group = readFirestoreValue(fields.group);
    if (typeof assetPath !== 'string' || !assetPath.startsWith('/assets/')) continue;
    files.push({
      id: readFirestoreValue(fields.id),
      name: readFirestoreValue(fields.name),
      chapter: itemChapter,
      group,
      groupLabel: inboxGroups[group] ?? group,
      path: assetPath,
      size: readFirestoreValue(fields.size),
      uploadedAt: readFirestoreValue(fields.uploadedAt) ?? null,
      url: toCdnUrl(assetPath),
    });
  }
  files.sort((a, b) => String(b.uploadedAt ?? '').localeCompare(String(a.uploadedAt ?? '')));
  return { ok: true, source: 'firestore', files };
}

function assertValidGlbBuffer(buffer, name) {
  if (buffer.length < 24) throw new Error(`Tệp ${name} quá nhỏ để là GLB 2.0.`);
  const magic = buffer.readUInt32LE(0);
  const version = buffer.readUInt32LE(4);
  if (magic !== 0x46546c67 || version !== 2) {
    throw new Error(`Tệp ${name} không có header GLB 2.0 hợp lệ.`);
  }
}

function safeTargetPath(baseDir, file) {
  const groupSegment = (file.groupLabel || file.group || 'Khác').replace(/[\\/\0]/g, '_');
  const safeName = path.basename(file.name).replace(/[\\/\0]/g, '_');
  const resolvedBase = path.resolve(WORKSPACE_ROOT, baseDir);
  if (resolvedBase !== WORKSPACE_ROOT && !resolvedBase.startsWith(WORKSPACE_ROOT + path.sep)) {
    throw new Error('Thư mục tải về phải nằm trong workspace.');
  }
  const target = path.resolve(resolvedBase, `Chuong-${file.chapter}`, groupSegment, safeName);
  if (!target.startsWith(resolvedBase + path.sep)) {
    throw new Error(`Đường dẫn không an toàn cho tệp ${file.name}.`);
  }
  return target;
}

async function downloadFiles(files, downloadDir) {
  const downloaded = [];
  const usedPaths = new Set();
  for (const file of files) {
    let target = safeTargetPath(downloadDir, file);
    if (usedPaths.has(target)) {
      const ext = path.extname(target);
      const stem = target.slice(0, -ext.length);
      target = `${stem}-${String(file.id).slice(0, 8)}${ext}`;
    }
    usedPaths.add(target);
    await mkdir(path.dirname(target), { recursive: true });
    const existing = await stat(target).catch(() => null);
    if (existing && existing.size === file.size) {
      downloaded.push({ id: file.id, target, skipped: true });
      continue;
    }
    const response = await fetch(file.url, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok) {
      throw new Error(`Không tải được ${file.name} (HTTP ${response.status}).`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    assertValidGlbBuffer(buffer, file.name);
    const tmp = `${target}.tmp-${process.pid}`;
    try {
      await writeFile(tmp, buffer);
      await rename(tmp, target);
    } catch (error) {
      await unlink(tmp).catch(() => {});
      throw error;
    }
    downloaded.push({ id: file.id, target, skipped: false, bytes: buffer.length });
  }
  return downloaded;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const workerResult = await fetchFromWorker(options.chapter).catch(() => ({ ok: false, reason: 'network' }));
  let result = workerResult;
  if (!result.ok) {
    const firestoreResult = await fetchFromFirestore(options.chapter).catch(() => ({ ok: false, reason: 'network' }));
    if (firestoreResult.ok) {
      result = firestoreResult;
    } else {
      const details = {
        ok: false,
        worker: workerResult.reason,
        firestore: firestoreResult.reason,
        message: 'Chưa thể tự đọc danh sách inbox. Hãy triển khai Worker (npm run deploy:worker) hoặc triển khai firestore.rules rồi mở /admin/assets.',
      };
      if (options.json) {
        console.log(JSON.stringify(details, null, 2));
      } else {
        console.error(details.message);
        console.error(`Chi tiết: worker=${workerResult.reason}, firestore=${firestoreResult.reason}`);
      }
      process.exitCode = 1;
      return;
    }
  }

  let downloaded = [];
  if (options.downloadDir && result.files.length > 0) {
    downloaded = await downloadFiles(result.files, options.downloadDir);
  }

  if (options.json) {
    console.log(JSON.stringify({
      ok: true,
      source: result.source,
      chapter: options.chapter,
      count: result.files.length,
      files: result.files,
      ...(options.downloadDir ? { downloaded } : {}),
    }, null, 2));
    return;
  }

  const scope = options.chapter ? `Chương ${options.chapter}` : 'tất cả các chương';
  console.log(`Nguồn: ${result.source} · ${scope} · ${result.files.length} tệp GLB`);
  for (const file of result.files) {
    const mb = (file.size / 1_000_000).toFixed(2);
    console.log(`- [Ch.${file.chapter} · ${file.groupLabel}] ${file.name} (${mb} MB)`);
    console.log(`  ${file.url}`);
  }
  if (downloaded.length > 0) {
    console.log(`Đã tải ${downloaded.length} tệp vào ${options.downloadDir}.`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
