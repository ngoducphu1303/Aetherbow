import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { CheckCircle2, CloudUpload, Loader2, RefreshCw, Rocket, XCircle } from 'lucide-react';
import { message, primary, secondary } from './assetAdminApi';

interface DeployJobState {
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

interface DeployStatus {
  hasB2Credentials: boolean;
  hasCloudflareCredentials: boolean;
  activeTask: string | null;
  chapter4LocalGlbCount?: number;
  job?: DeployJobState | null;
}

interface DeployResult {
  ok: boolean;
  async?: boolean;
  jobId?: string;
  job?: DeployJobState;
  output?: string;
  error?: string;
}

const SUCCESS_TEXT_BY_ACTION: Record<string, string> = {
  'upload-ch4': 'Đã tạo/kiểm chuẩn và đồng bộ 28 tệp GLB Chương 4 lên Backblaze B2 & xác minh CDN thành công.',
  'upload-ch3': 'Đã đồng bộ 28 tệp GLB Chương 3 lên Backblaze B2 và xác minh trên CDN.',
  'upload-all': 'Đã đồng bộ toàn bộ tệp GLB lên Backblaze B2 và xác minh CDN.',
  'deploy-worker': 'Đã deploy Cloudflare Worker (glb-cdn) thành công.',
};

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
  const [stageText, setStageText] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [output, setOutput] = useState('');
  const activeJobIdRef = useRef<string | null>(null);
  const logBoxRef = useRef<HTMLPreElement | null>(null);

  const applyJobState = useCallback((job: DeployJobState | null | undefined, fromPoll: boolean) => {
    if (!job) return;
    if (job.output) setOutput(job.output);
    if (job.status === 'running') {
      activeJobIdRef.current = job.id;
      setRunning(job.action);
      setStageText(job.stage);
      setError('');
      setNotice('');
    } else if (fromPoll || activeJobIdRef.current === job.id) {
      activeJobIdRef.current = null;
      setRunning(null);
      setStageText('');
      if (job.status === 'succeeded') {
        setError('');
        setNotice(SUCCESS_TEXT_BY_ACTION[job.action] ?? 'Đã hoàn tất thành công.');
      } else if (job.status === 'failed') {
        setNotice('');
        setError(job.error ?? 'Thao tác thất bại. Vui lòng xem chi tiết bên dưới.');
      }
    }
  }, []);

  const fetchStatus = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoadingStatus(true);
        setError('');
      }
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
        const data = (await response.json().catch(() => null)) as (DeployStatus & { error?: string }) | null;
        if (!response.ok || !data) {
          throw new Error(data?.error ?? 'Không thể kiểm tra cấu hình Secrets trên máy chủ.');
        }
        setStatus(data);
        if (data.job) {
          applyJobState(data.job, silent);
        }
      } catch (cause) {
        if (!silent) setError(message(cause));
      } finally {
        if (!silent) setLoadingStatus(false);
      }
    },
    [user, applyJobState],
  );

  useEffect(() => {
    void fetchStatus(false);
  }, [fetchStatus]);

  useEffect(() => {
    if (!running || running === 'deploy-worker') return;
    const timer = window.setInterval(() => {
      void fetchStatus(true);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [running, fetchStatus]);

  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [output]);

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
    setStageText('Đang khởi tạo tác vụ trên máy chủ…');
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
        setRunning(null);
        setStageText('');
        throw new Error(data?.error ?? 'Thao tác thất bại. Vui lòng xem chi tiết bên dưới.');
      }
      if (data.async && data.job) {
        activeJobIdRef.current = data.job.id;
        setStageText(data.job.stage);
        if (data.job.output) setOutput(data.job.output);
        return;
      }
      setRunning(null);
      setStageText('');
      setNotice(successText ?? 'Đã hoàn tất thành công.');
      void fetchStatus(true);
    } catch (cause) {
      setRunning(null);
      setStageText('');
      setError(message(cause));
    }
  };

  return (
    <section className="mx-auto mt-6 max-w-6xl space-y-5 rounded-2xl border border-slate-800 bg-slate-900/85 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Đồng bộ Backblaze B2 &amp; Deploy Cloudflare Worker</h2>
          <p className="mt-1 text-sm text-slate-400">
            Sử dụng trực tiếp các biến bí mật đã lưu trong Settings → Secrets của máy chủ ứng dụng.
            {typeof status?.chapter4LocalGlbCount === 'number' && status.chapter4LocalGlbCount < 28 && (
              <span className="ml-1 text-amber-300/90">
                (Chương 4 cục bộ: {status.chapter4LocalGlbCount}/28 — bấm đẩy B2 sẽ tự động tải từ Drive &amp; nén trước khi tải lên.)
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          className={secondary}
          disabled={loadingStatus || Boolean(running)}
          onClick={() => void fetchStatus(false)}
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
                  'upload-ch4',
                  '/api/admin/asset-deploy/upload-b2',
                  { prefix: 'Chương 4/Runtime', verifyCdn: true },
                  SUCCESS_TEXT_BY_ACTION['upload-ch4'],
                )
              }
            >
              {running === 'upload-ch4' ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />}
              {running === 'upload-ch4' ? 'Đang xử lý & đẩy Chương 4 lên B2…' : 'Đẩy 28 GLB Chương 4 lên B2'}
            </button>

            <button
              type="button"
              className={secondary}
              disabled={!status?.hasB2Credentials || Boolean(running)}
              onClick={() =>
                void runAction(
                  'upload-ch3',
                  '/api/admin/asset-deploy/upload-b2',
                  { prefix: 'Chương 3/Runtime', verifyCdn: true },
                  SUCCESS_TEXT_BY_ACTION['upload-ch3'],
                )
              }
            >
              {running === 'upload-ch3' ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />}
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
                  SUCCESS_TEXT_BY_ACTION['upload-all'],
                )
              }
            >
              {running === 'upload-all' ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />}
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
                  SUCCESS_TEXT_BY_ACTION['deploy-worker'],
                )
              }
            >
              {running === 'deploy-worker' ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
              {running === 'deploy-worker' ? 'Đang deploy Worker…' : 'Deploy Cloudflare Worker'}
            </button>
          </div>
        </>
      )}

      {running && stageText && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-400/35 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
          <Loader2 size={16} className="shrink-0 animate-spin" />
          <span>{stageText}</span>
        </div>
      )}
      {notice && <p role="status" className="text-sm font-medium text-emerald-300">{notice}</p>}
      {error && <p role="alert" className="text-sm font-medium text-rose-300">{error}</p>}
      {output && (
        <pre
          ref={logBoxRef}
          className="max-h-72 overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-300 whitespace-pre-wrap"
        >
          {output}
        </pre>
      )}
    </section>
  );
}
