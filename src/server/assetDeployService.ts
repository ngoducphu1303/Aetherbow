import { execFile, spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import type express from 'express';
import { promisify } from 'node:util';
import { getApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import adminAuth from '../../scripts/asset-admin-auth.json' with { type: 'json' };
import manifest from '../../scripts/glb-manifest.json' with { type: 'json' };
import {
  createApiRateLimitMiddleware,
  isVerifiedAdminClaims,
} from './serverSecurity.ts';

const execFileAsync = promisify(execFile);
const SAFE_PREFIX_RE = /^[A-Za-z0-9\u00C0-\u1EF9._\-\/ ]{1,120}$/;
const MAX_JOB_OUTPUT_CHARS = 64_000;
const EXPECTED_CHAPTER4_GLB_COUNT = 28;

interface ResolvedCredentials {
  b2KeyId: string;
  b2ApplicationKey: string;
  cloudflareAccountId: string;
  cloudflareApiToken: string;
}

export interface DeployJobState {
  id: string;
  action: string;
  prefix?: string;
  status: 'running' | 'succeeded' | 'failed';
  stage: string;
  startedAt: number;
  finishedAt?: number;
  error?: string;
  output: string;
}

function firstEnv(names: readonly string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return '';
}

function resolveCredentials(): ResolvedCredentials {
  return {
    b2KeyId: firstEnv(['B2_KEY_ID', 'B2_WRITE_KEY_ID', 'BACKBLAZE_KEY_ID']),
    b2ApplicationKey: firstEnv([
      'B2_APPLICATION_KEY',
      'B2_WRITE_APPLICATION_KEY',
      'BACKBLAZE_APPLICATION_KEY',
      'B2_APP_KEY',
    ]),
    cloudflareAccountId: firstEnv(['CLOUDFLARE_ACCOUNT_ID', 'CF_ACCOUNT_ID']),
    cloudflareApiToken: firstEnv(['CLOUDFLARE_API_TOKEN', 'CF_API_TOKEN']),
  };
}

function redactSecrets(text: string, creds: ResolvedCredentials): string {
  let clean = text;
  for (const secret of [
    creds.b2KeyId,
    creds.b2ApplicationKey,
    creds.cloudflareAccountId,
    creds.cloudflareApiToken,
  ]) {
    if (secret && secret.length >= 6) {
      clean = clean.split(secret).join('[REDACTED]');
    }
  }
  return clean;
}

function validatePrefix(raw: unknown): string | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (typeof raw !== 'string') throw new Error('INVALID_PREFIX');
  const trimmed = raw.trim().normalize('NFC');
  if (!trimmed || trimmed.startsWith('/') || trimmed.includes('..') || !SAFE_PREFIX_RE.test(trimmed)) {
    throw new Error('INVALID_PREFIX');
  }
  return trimmed;
}

function countLocalGlbs(rootDir: string, prefix?: string): number {
  const assetsDir = path.join(rootDir, 'public', 'assets');
  if (!existsSync(assetsDir)) return 0;
  const normalizedPrefix = prefix
    ? prefix
        .normalize('NFC')
        .replaceAll('\\', '/')
        .replace(/^\/+/, '')
        .replace(/^public\//, '')
        .replace(/^assets\//, '')
    : undefined;
  let count = 0;
  const entries = readdirSync(assetsDir, { recursive: true, withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.glb')) continue;
    const fullPath = path.join(entry.parentPath, entry.name);
    const rel = path.relative(assetsDir, fullPath).replaceAll('\\', '/').normalize('NFC');
    if (!normalizedPrefix || rel.startsWith(normalizedPrefix)) {
      count += 1;
    }
  }
  return count;
}

function spawnStreamingCommand(
  cmd: string,
  args: string[],
  options: {
    cwd: string;
    env: NodeJS.ProcessEnv;
    timeoutMs: number;
    onChunk: (chunk: string) => void;
  },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 5_000).unref();
    }, options.timeoutMs);

    child.stdout?.on('data', (buf: Buffer) => {
      options.onChunk(buf.toString('utf8'));
    });
    child.stderr?.on('data', (buf: Buffer) => {
      options.onChunk(buf.toString('utf8'));
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new Error(`Lệnh vượt quá thời gian cho phép (${Math.round(options.timeoutMs / 1000)}s).`));
      } else if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `Lệnh kết thúc với mã lỗi ${code ?? 'null'}${signal ? ` (signal ${signal})` : ''}: ${cmd} ${args.join(' ')}`,
          ),
        );
      }
    });
  });
}

export async function verifyWorkerAdminSession(token: string): Promise<boolean> {
  const cdnBase = String(manifest.cdnBaseUrl || '').trim();
  if (!cdnBase) return false;
  try {
    const url = new URL('__admin/session', cdnBase);
    const response = await fetch(url.href, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      redirect: 'manual',
      signal: AbortSignal.timeout(8_000),
    });
    await response.body?.cancel();
    return response.ok;
  } catch {
    return false;
  }
}

export interface DecodedAdminTokenClaims {
  email?: string;
  email_verified?: boolean;
  firebase?: { sign_in_provider?: string };
}

/**
 * Hardened admin authorization evaluator for Asset Deploy & CDN routes:
 * - Verified Google owner (canonical verified admin or ADMIN_GOOGLE_EMAIL) is allowed directly.
 * - Password admin (puugoo) MUST ALSO pass Worker `__admin/session` verification so an unlinked
 *   or forged password account with matching email can never invoke B2 upload or Worker deploy.
 * - Any other verified Google user is allowed only if Worker `__admin/session` confirms membership.
 */
export async function verifyAssetAdminAuthorization(params: {
  decoded: DecodedAdminTokenClaims;
  token: string;
  allowedPasswordEmail?: string;
  allowedGoogleEmail?: string;
  verifyWorkerSession?: (token: string) => Promise<boolean>;
}): Promise<boolean> {
  const email = params.decoded.email?.toLowerCase().trim() ?? '';
  const provider = params.decoded.firebase?.sign_in_provider;
  const verifySession = params.verifyWorkerSession ?? verifyWorkerAdminSession;
  const allowedPasswordEmail = (
    params.allowedPasswordEmail ?? adminAuth.passwordEmail
  )
    .toLowerCase()
    .trim();

  if (provider === 'password') {
    if (!email || email !== allowedPasswordEmail) {
      return false;
    }
    return await verifySession(params.token);
  }

  if (params.decoded.email_verified === true && provider === 'google.com') {
    if (isVerifiedAdminClaims({ email, emailVerified: true })) {
      return true;
    }
    const allowedGoogleEmail = (
      params.allowedGoogleEmail ?? process.env.ADMIN_GOOGLE_EMAIL ?? ''
    )
      .trim()
      .toLowerCase();
    if (allowedGoogleEmail && email === allowedGoogleEmail) {
      return true;
    }
    return await verifySession(params.token);
  }

  return false;
}

export function mountAssetDeployRoutes(
  app: express.Application,
  rootDir: string,
  firebaseProjectId: string | null,
): void {
  let activeTask: string | null = null;
  let currentJob: DeployJobState | null = null;

  const statusRateLimit = createApiRateLimitMiddleware({
    scope: 'asset-deploy-status',
    maxRequests: 30,
    windowMs: 60_000,
  });
  const deployMutationRateLimit = createApiRateLimitMiddleware({
    scope: 'asset-deploy-mutation',
    maxRequests: 6,
    windowMs: 60_000,
  });

  async function isAuthorizedAdmin(req: express.Request): Promise<boolean> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ') || !firebaseProjectId || getApps().length === 0) {
      return false;
    }
    const token = authHeader.slice('Bearer '.length).trim();
    if (!token || token.length > 9000) return false;

    try {
      const decoded = await getAuth(getApp()).verifyIdToken(token);
      return await verifyAssetAdminAuthorization({
        decoded,
        token,
      });
    } catch {
      return false;
    }
  }

  function appendJobLog(job: DeployJobState, text: string, creds: ResolvedCredentials): void {
    const clean = redactSecrets(text, creds);
    job.output = `${job.output}${clean}`;
    if (job.output.length > MAX_JOB_OUTPUT_CHARS) {
      job.output = `…(đã rút gọn log cũ)…\n${job.output.slice(-MAX_JOB_OUTPUT_CHARS)}`;
    }
  }

  app.get('/api/admin/asset-deploy/status', statusRateLimit, async (req, res) => {
    if (!(await isAuthorizedAdmin(req))) {
      res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác đồng bộ CDN.' });
      return;
    }
    const creds = resolveCredentials();
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      hasB2Credentials: Boolean(creds.b2KeyId && creds.b2ApplicationKey),
      hasCloudflareCredentials: Boolean(creds.cloudflareAccountId && creds.cloudflareApiToken),
      activeTask,
      chapter4LocalGlbCount: countLocalGlbs(rootDir, 'Chương 4/Runtime'),
      job: currentJob,
    });
  });

  app.post('/api/admin/asset-deploy/upload-b2', deployMutationRateLimit, async (req, res) => {
    if (!(await isAuthorizedAdmin(req))) {
      res.status(403).json({ error: 'Bạn không có quyền đồng bộ Backblaze B2.' });
      return;
    }
    if (activeTask) {
      res.status(409).json({
        error: 'Đang có tác vụ đồng bộ chạy. Hãy đợi hoàn tất.',
        activeTask,
        job: currentJob,
      });
      return;
    }

    let prefix: string | undefined;
    try {
      prefix = validatePrefix(req.body?.prefix);
    } catch {
      res.status(400).json({ error: 'Tiền tố thư mục GLB không hợp lệ.' });
      return;
    }
    const verifyCdn = req.body?.verifyCdn !== false;
    const checkOnly = req.body?.checkOnly === true;

    const creds = resolveCredentials();
    if (!creds.b2KeyId || !creds.b2ApplicationKey) {
      res.status(503).json({
        error: 'Máy chủ chưa thấy B2_KEY_ID / B2_APPLICATION_KEY trong Settings -> Secrets.',
      });
      return;
    }

    const job: DeployJobState = {
      id: `b2-${Date.now().toString(36)}`,
      action: prefix === 'Chương 4/Runtime' ? 'upload-ch4' : prefix === 'Chương 3/Runtime' ? 'upload-ch3' : 'upload-all',
      prefix,
      status: 'running',
      stage: 'Đang kiểm tra tệp GLB cục bộ trên máy chủ…',
      startedAt: Date.now(),
      output: '',
    };
    currentJob = job;
    activeTask = 'upload-b2';

    const childEnv: NodeJS.ProcessEnv = {
      ...process.env,
      B2_KEY_ID: creds.b2KeyId,
      B2_APPLICATION_KEY: creds.b2ApplicationKey,
    };

    // Run asynchronously so long Google Drive download + mesh compression + B2 upload never hits HTTP proxy timeout
    void (async () => {
      try {
        const isChapter4 = prefix?.startsWith('Chương 4') || !prefix;
        if (isChapter4) {
          const ch4Count = countLocalGlbs(rootDir, 'Chương 4/Runtime');
          if (ch4Count < EXPECTED_CHAPTER4_GLB_COUNT) {
            job.stage = `Đang tự động tải & nén ${EXPECTED_CHAPTER4_GLB_COUNT} GLB Chương 4 từ Google Drive (3 luồng song song)…`;
            appendJobLog(
              job,
              `[Auto-Build] Máy chủ Preview hiện có ${ch4Count}/${EXPECTED_CHAPTER4_GLB_COUNT} tệp GLB Chương 4 (do .gitignore không lưu tệp .glb trong snapshot).\n` +
                `[Auto-Build] Bắt đầu tự động tải nguồn từ Google Drive và nén chuẩn High + Dell Latitude E5430 Lite…\n\n`,
              creds,
            );
            await spawnStreamingCommand(
              process.execPath,
              ['scripts/build-chapter4-variants.mjs', '--skip-portraits', '--skip-existing', '--concurrency', '3'],
              {
                cwd: rootDir,
                env: childEnv,
                timeoutMs: 600_000,
                onChunk: (chunk) => appendJobLog(job, chunk, creds),
              },
            );
            appendJobLog(job, '\n[Auto-Build] Đã tạo & kiểm chuẩn thành công 28 GLB Chương 4!\n\n', creds);
          } else {
            appendJobLog(
              job,
              `[Check] Đã có đủ ${ch4Count}/${EXPECTED_CHAPTER4_GLB_COUNT} tệp GLB Chương 4 cục bộ — chuyển thẳng sang đẩy lên Backblaze B2.\n\n`,
              creds,
            );
          }
        } else if (prefix && countLocalGlbs(rootDir, prefix) === 0) {
          job.stage = `Đang kéo bản sao cục bộ cho ${prefix} từ CDN…`;
          appendJobLog(
            job,
            `[Sync] Chưa có tệp GLB cục bộ cho "${prefix}". Đang thử đồng bộ tệp từ CDN về máy chủ…\n`,
            creds,
          );
          await spawnStreamingCommand(process.execPath, ['scripts/sync-glb-assets.mjs'], {
            cwd: rootDir,
            env: childEnv,
            timeoutMs: 240_000,
            onChunk: (chunk) => appendJobLog(job, chunk, creds),
          }).catch((err) => {
            appendJobLog(
              job,
              `[Sync] Cảnh báo khi tải từ CDN: ${err instanceof Error ? err.message : String(err)}\n`,
              creds,
            );
          });
        }

        const uploadArgs = ['scripts/upload-glb-b2.mjs', '--native'];
        if (prefix) uploadArgs.push('--prefix', prefix);
        if (checkOnly) uploadArgs.push('--check');
        if (verifyCdn) uploadArgs.push('--verify-cdn');

        job.stage = prefix
          ? `Đang đẩy GLB (${prefix}) lên Backblaze B2 và xác minh CDN…`
          : 'Đang đồng bộ toàn bộ GLB lên Backblaze B2 và xác minh CDN…';
        appendJobLog(job, `[B2 Upload] Chạy: node ${uploadArgs.join(' ')}\n`, creds);

        await spawnStreamingCommand(process.execPath, uploadArgs, {
          cwd: rootDir,
          env: childEnv,
          timeoutMs: 300_000,
          onChunk: (chunk) => appendJobLog(job, chunk, creds),
        });

        job.status = 'succeeded';
        job.stage = 'Hoàn tất đồng bộ Backblaze B2 & xác minh CDN!';
        job.finishedAt = Date.now();
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        appendJobLog(job, `\n[ERROR] ${msg}\n`, creds);
        job.status = 'failed';
        job.error = 'Đồng bộ Backblaze B2 thất bại.';
        job.stage = 'Đồng bộ thất bại — xem chi tiết log bên dưới.';
        job.finishedAt = Date.now();
      } finally {
        activeTask = null;
      }
    })();

    res.setHeader('Cache-Control', 'no-store');
    res.status(202).json({
      ok: true,
      async: true,
      jobId: job.id,
      job,
    });
  });

  app.post('/api/admin/asset-deploy/deploy-worker', deployMutationRateLimit, async (req, res) => {
    if (!(await isAuthorizedAdmin(req))) {
      res.status(403).json({ error: 'Bạn không có quyền deploy Cloudflare Worker.' });
      return;
    }
    if (activeTask) {
      res.status(409).json({ error: 'Đang có tác vụ chạy. Hãy đợi hoàn tất.', activeTask });
      return;
    }

    const creds = resolveCredentials();
    if (!creds.cloudflareAccountId || !creds.cloudflareApiToken) {
      res.status(503).json({
        error: 'Máy chủ chưa thấy CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN trong Settings -> Secrets.',
      });
      return;
    }

    activeTask = 'deploy-worker';
    try {
      const { stdout, stderr } = await execFileAsync('npm', ['run', 'deploy:worker'], {
        cwd: rootDir,
        env: {
          ...process.env,
          CLOUDFLARE_ACCOUNT_ID: creds.cloudflareAccountId,
          CLOUDFLARE_API_TOKEN: creds.cloudflareApiToken,
        },
        timeout: 180_000,
        maxBuffer: 2 * 1024 * 1024,
      });
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        ok: true,
        output: redactSecrets(`${stdout}\n${stderr}`.trim(), creds),
      });
    } catch (error) {
      const err = error as { stdout?: string; stderr?: string; message?: string };
      res.status(500).json({
        ok: false,
        error: 'Deploy Cloudflare Worker thất bại.',
        output: redactSecrets(`${err.stdout ?? ''}\n${err.stderr ?? ''}\n${err.message ?? ''}`.trim(), creds),
      });
    } finally {
      activeTask = null;
    }
  });
}
