import { execFile } from 'node:child_process';
import type express from 'express';
import { promisify } from 'node:util';
import { getApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import adminAuth from '../../scripts/asset-admin-auth.json' with { type: 'json' };
import manifest from '../../scripts/glb-manifest.json' with { type: 'json' };

const execFileAsync = promisify(execFile);
const SAFE_PREFIX_RE = /^[A-Za-z0-9\u00C0-\u1EF9._\-\/ ]{1,120}$/;

interface ResolvedCredentials {
  b2KeyId: string;
  b2ApplicationKey: string;
  cloudflareAccountId: string;
  cloudflareApiToken: string;
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
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith('/') || trimmed.includes('..') || !SAFE_PREFIX_RE.test(trimmed)) {
    throw new Error('INVALID_PREFIX');
  }
  return trimmed;
}

async function verifyWorkerAdminSession(token: string): Promise<boolean> {
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

export function mountAssetDeployRoutes(
  app: express.Application,
  rootDir: string,
  firebaseProjectId: string | null,
): void {
  let activeTask: string | null = null;

  async function isAuthorizedAdmin(req: express.Request): Promise<boolean> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ') || !firebaseProjectId || getApps().length === 0) {
      return false;
    }
    const token = authHeader.slice('Bearer '.length).trim();
    if (!token || token.length > 9000) return false;

    try {
      const decoded = await getAuth(getApp()).verifyIdToken(token);
      const email = decoded.email?.toLowerCase() ?? '';
      const provider = decoded.firebase?.sign_in_provider;
      const allowedPasswordEmail = adminAuth.passwordEmail.toLowerCase();
      if (provider === 'password' && email === allowedPasswordEmail) {
        return true;
      }
      const allowedGoogleEmail = process.env.ADMIN_GOOGLE_EMAIL?.trim().toLowerCase();
      if (
        allowedGoogleEmail &&
        decoded.email_verified === true &&
        provider === 'google.com' &&
        email === allowedGoogleEmail
      ) {
        return true;
      }
      if (decoded.email_verified === true && provider === 'google.com') {
        return await verifyWorkerAdminSession(token);
      }
      return false;
    } catch {
      return false;
    }
  }

  app.get('/api/admin/asset-deploy/status', async (req, res) => {
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
    });
  });

  app.post('/api/admin/asset-deploy/upload-b2', async (req, res) => {
    if (!(await isAuthorizedAdmin(req))) {
      res.status(403).json({ error: 'Bạn không có quyền đồng bộ Backblaze B2.' });
      return;
    }
    if (activeTask) {
      res.status(409).json({ error: 'Đang có tác vụ đồng bộ chạy. Hãy đợi hoàn tất.', activeTask });
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

    const args = ['scripts/upload-glb-b2.mjs', '--native'];
    if (prefix) args.push('--prefix', prefix);
    if (checkOnly) args.push('--check');
    if (verifyCdn) args.push('--verify-cdn');

    activeTask = 'upload-b2';
    try {
      const { stdout, stderr } = await execFileAsync(process.execPath, args, {
        cwd: rootDir,
        env: {
          ...process.env,
          B2_KEY_ID: creds.b2KeyId,
          B2_APPLICATION_KEY: creds.b2ApplicationKey,
        },
        timeout: 240_000,
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
        error: 'Đồng bộ Backblaze B2 thất bại.',
        output: redactSecrets(`${err.stdout ?? ''}\n${err.stderr ?? ''}\n${err.message ?? ''}`.trim(), creds),
      });
    } finally {
      activeTask = null;
    }
  });

  app.post('/api/admin/asset-deploy/deploy-worker', async (req, res) => {
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
