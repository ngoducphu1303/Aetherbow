import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { CheckCircle2, CloudUpload, RefreshCw, Rocket, XCircle } from 'lucide-react';
import { message, primary, secondary } from './assetAdminApi';

interface DeployStatus {
  hasB2Credentials: boolean;
  hasCloudflareCredentials: boolean;
  activeTask: string | null;
}

interface DeployResult {
  ok: boolean;
  output?: string;
  error?: string;
}

export default function AssetDeployPanel({
  user,
  onBusyChange,
}: {
  user: User;
  onBusyChange: (busy: boolean) => void;
}) {
  const [status, setStatus] = useState<DeployStatus | null>(null);
  const [staticHost, setStaticHost] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [output, setOutput] = useState('');

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    setError('');
    setStaticHost(false);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/asset-deploy/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const contentType = response.headers.get('content-type') ?? '';
      if (response.status === 404 || !contentType.includes('application/json')) {
        setStaticHost(true);
        setStatus(null);
        return;
      }
      const data = await response.json().catch(() => null);
      if (!response.ok || !data) {
        throw new Error(data?.error ?? 'Không thể kiểm tra cấu hình Secrets trên máy chủ.');
      }
      setStatus(data as DeployStatus);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setLoadingStatus(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    onBusyChange(Boolean(running));
    return () => onBusyChange(false);
  }, [running, onBusyChange]);

  const runAction = async (
    actionKey: string,
    endpoint: string,
    body?: Record<string, unknown>,
    successText?: string,
  ) => {
    if (running) return;
    setRunning(actionKey);
    setNotice('');
    setError('');
    setOutput('');
    try {
      const token = await user.getIdToken();
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body ?? {}),
      });
      const data = (await response.json().catch(() => null)) as DeployResult | null;
      if (data?.output) setOutput(data.output);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error ?? 'Thao tác thất bại. Vui lòng xem chi tiết bên dưới.');
      }
      setNotice(successText ?? 'Đã hoàn tất thành công.');
      void fetchStatus();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setRunning(null);
    }
  };

  return (
    <section className="mx-auto mt-6 max-w-6xl space-y-5 rounded-2xl border border-slate-800 bg-slate-900/85 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Đồng bộ Backblaze B2 &amp; Deploy Cloudflare Worker</h2>
          <p className="mt-1 text-sm text-slate-400">
            Sử dụng trực tiếp các biến bí mật đã lưu trong Settings → Secrets của máy chủ ứng dụng.
          </p>
        </div>
        <button
          type="button"
          className={secondary}
          disabled={loadingStatus || Boolean(running)}
          onClick={() => void fetchStatus()}
        >
          <RefreshCw size={16} className={loadingStatus ? 'animate-spin' : ''} />
          Kiểm tra lại Secrets
        </button>
      </div>

      {staticHost ? (
        <div className="rounded-xl border border-amber-400/35 bg-amber-500/10 p-4 text-sm text-amber-100 space-y-2">
          <p className="font-semibold">
            Bản Vercel hiện chỉ phục vụ trang web tĩnh nên không có máy chủ Express chứa Secrets.
          </p>
          <p className="text-xs text-amber-200/90">
            Để chạy đồng bộ Backblaze B2 và deploy Cloudflare Worker, hãy mở game trên <strong>AI Studio Preview</strong>, bấm vào biểu tượng <strong>Cài đặt → Quản trị 3D &amp; Đồng bộ CDN</strong> rồi đăng nhập bằng tài khoản <strong>puugoo</strong>.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                {status?.hasB2Credentials ? (
                  <CheckCircle2 size={18} className="text-emerald-400" />
                ) : (
                  <XCircle size={18} className="text-rose-400" />
                )}
                <span>
                  Backblaze B2 (<code className="text-xs text-amber-200">B2_KEY_ID</code> &amp;{' '}
                  <code className="text-xs text-amber-200">B2_APPLICATION_KEY</code>)
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {loadingStatus
                  ? 'Đang kiểm tra…'
                  : status?.hasB2Credentials
                    ? 'Đã sẵn sàng đồng bộ file GLB lên bucket aetherbow-assets.'
                    : 'Chưa nhận được key trên máy chủ. Hãy kiểm tra tên biến trong Settings → Secrets.'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                {status?.hasCloudflareCredentials ? (
                  <CheckCircle2 size={18} className="text-emerald-400" />
                ) : (
                  <XCircle size={18} className="text-rose-400" />
                )}
                <span>
                  Cloudflare (<code className="text-xs text-amber-200">CLOUDFLARE_ACCOUNT_ID</code> &amp;{' '}
                  <code className="text-xs text-amber-200">CLOUDFLARE_API_TOKEN</code>)
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {loadingStatus
                  ? 'Đang kiểm tra…'
                  : status?.hasCloudflareCredentials
                    ? 'Đã sẵn sàng deploy Worker glb-cdn.'
                    : 'Chưa nhận được key trên máy chủ. Hãy kiểm tra tên biến trong Settings → Secrets.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={primary}
              disabled={!status?.hasB2Credentials || Boolean(running)}
              onClick={() =>
                void runAction(
                  'upload-ch3',
                  '/api/admin/asset-deploy/upload-b2',
                  { prefix: 'Chương 3/Runtime', verifyCdn: true },
                  'Đã đồng bộ 28 tệp GLB Chương 3 lên Backblaze B2 và xác minh trên CDN.',
                )
              }
            >
              <CloudUpload size={16} />
              {running === 'upload-ch3' ? 'Đang tải Chương 3 lên B2…' : 'Đẩy 28 GLB Chương 3 lên B2'}
            </button>

            <button
              type="button"
              className={secondary}
              disabled={!status?.hasB2Credentials || Boolean(running)}
              onClick={() =>
                void runAction(
                  'upload-all',
                  '/api/admin/asset-deploy/upload-b2',
                  { verifyCdn: true },
                  'Đã đồng bộ toàn bộ tệp GLB cục bộ lên Backblaze B2 và xác minh CDN.',
                )
              }
            >
              <CloudUpload size={16} />
              {running === 'upload-all' ? 'Đang đồng bộ toàn bộ…' : 'Đồng bộ toàn bộ GLB lên B2'}
            </button>

            <button
              type="button"
              className={secondary}
              disabled={!status?.hasCloudflareCredentials || Boolean(running)}
              onClick={() =>
                void runAction(
                  'deploy-worker',
                  '/api/admin/asset-deploy/deploy-worker',
                  {},
                  'Đã deploy Cloudflare Worker (glb-cdn) thành công.',
                )
              }
            >
              <Rocket size={16} />
              {running === 'deploy-worker' ? 'Đang deploy Worker…' : 'Deploy Cloudflare Worker'}
            </button>
          </div>
        </>
      )}

      {notice && <p role="status" className="text-sm font-medium text-emerald-300">{notice}</p>}
      {error && <p role="alert" className="text-sm font-medium text-rose-300">{error}</p>}
      {output && (
        <pre className="max-h-72 overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-300 whitespace-pre-wrap">
          {output}
        </pre>
      )}
    </section>
  );
}
