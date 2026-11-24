import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  History,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import manifest from '../../scripts/glb-manifest.json';
import {
  computeLiveOpsConfigDiff,
  DEFAULT_LIVEOPS_CONFIG,
  LIVEOPS_BOUNDS,
  MAX_LIVEOPS_SNAPSHOTS,
  type LiveOpsConfig,
  type LiveOpsSnapshotEntry,
} from '../data/liveOpsConfig';
import {
  persistLiveOpsSnapshot,
  publishLiveOpsConfig,
  readLiveOpsSnapshotHistory,
  rollbackLiveOpsToSnapshot,
  subscribeLiveOpsConfig,
  type LiveOpsSource,
} from '../services/liveOpsConfigService';
import {
  validateGlbPipelineManifest,
  type GlbManifestDocument,
} from '../engine/glbPipelineValidator';

interface AssetAdminLiveOpsTabProps {
  user: User;
  onBusyChange?: (busy: boolean) => void;
  externalActiveConfig?: LiveOpsConfig;
  externalSource?: LiveOpsSource;
  onConfigPublished?: (nextCfg: LiveOpsConfig, source: LiveOpsSource) => void;
}

function formatMb(bytes: number): string {
  return `${(bytes / 1_048_576).toFixed(2)} MB`;
}

function formatTimeLabel(ts: number): string {
  if (!ts || ts <= 0) return 'Chưa có mốc';
  try {
    return new Date(ts).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  } catch {
    return 'Vừa xong';
  }
}

export default function AssetAdminLiveOpsTab({
  user,
  onBusyChange,
  externalActiveConfig,
  externalSource,
  onConfigPublished,
}: AssetAdminLiveOpsTabProps) {
  const [activeConfig, setActiveConfig] = useState<LiveOpsConfig>(
    externalActiveConfig ?? DEFAULT_LIVEOPS_CONFIG
  );
  const [source, setSource] = useState<LiveOpsSource>(externalSource ?? 'local');
  const [draft, setDraft] = useState<LiveOpsConfig>(externalActiveConfig ?? DEFAULT_LIVEOPS_CONFIG);
  const [snapshots, setSnapshots] = useState<LiveOpsSnapshotEntry[]>(() =>
    readLiveOpsSnapshotHistory()
  );
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showAllIssues, setShowAllIssues] = useState(false);
  const [anomalyLoading, setAnomalyLoading] = useState(false);
  const [anomalyError, setAnomalyError] = useState('');
  const [anomalyData, setAnomalyData] = useState<{
    summary: {
      totalRecorded: number;
      retainedCount: number;
      maxCapacity: number;
      countsByCategory: {
        rate_limit: number;
        ws_clamped: number;
        auth_invalid: number;
        admin_denied: number;
      };
      lastEventAtMs: number | null;
    };
    recent: Array<{
      id: string;
      ts: number;
      category: 'rate_limit' | 'ws_clamped' | 'auth_invalid' | 'admin_denied';
      scope: string;
      actor: string;
      detail: string;
    }>;
  } | null>(null);

  const loadSecurityAnomalies = useCallback(async () => {
    setAnomalyLoading(true);
    setAnomalyError('');
    try {
      const token = await user.getIdToken();
      const resp = await fetch('/api/admin/security-anomalies?limit=20', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        setAnomalyError(`Không thể tải nhật ký an ninh (HTTP ${resp.status}).`);
        return;
      }
      const json = (await resp.json()) as {
        ok?: boolean;
        summary?: NonNullable<typeof anomalyData>['summary'];
        recent?: NonNullable<typeof anomalyData>['recent'];
      };
      if (json.ok && json.summary && Array.isArray(json.recent)) {
        setAnomalyData({ summary: json.summary, recent: json.recent });
      }
    } catch {
      setAnomalyError('Không thể kết nối máy chủ giám sát an ninh.');
    } finally {
      setAnomalyLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadSecurityAnomalies();
  }, [loadSecurityAnomalies]);

  useEffect(() => {
    if (externalActiveConfig) {
      setActiveConfig(externalActiveConfig);
      setDraft(externalActiveConfig);
      if (externalSource) setSource(externalSource);
      return;
    }
    const unsub = subscribeLiveOpsConfig((cfg, src) => {
      setActiveConfig(cfg);
      setSource(src);
      setDraft((prev) => (prev.version === DEFAULT_LIVEOPS_CONFIG.version && prev.updatedAtMs === 0 ? cfg : prev));
      if (cfg.updatedAtMs > 0) {
        setSnapshots((prev) => (prev.length === 0 ? persistLiveOpsSnapshot(cfg, src) : prev));
      }
    });
    return () => unsub();
  }, [externalActiveConfig, externalSource]);

  const glbReport = useMemo(
    () => validateGlbPipelineManifest(manifest as GlbManifestDocument),
    []
  );

  const pendingDiffs = useMemo(
    () => computeLiveOpsConfigDiff(activeConfig, draft),
    [activeConfig, draft]
  );

  const setLoading = (next: boolean) => {
    setBusy(next);
    onBusyChange?.(next);
  };

  const handlePublish = async () => {
    setLoading(true);
    setErrorMsg('');
    setStatusMsg('');
    try {
      const result = await publishLiveOpsConfig(user, draft, activeConfig);
      setActiveConfig(result.config);
      setDraft(result.config);
      setSource(result.source);
      setSnapshots(result.snapshots);
      onConfigPublished?.(result.config, result.source);
      setStatusMsg(
        `Đã xuất bản LiveOps v${result.config.version} (${result.source === 'firestore' ? 'Firestore + Server' : 'Máy chủ'}) và lưu mốc khôi phục.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Xuất bản LiveOps thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (entry: LiveOpsSnapshotEntry) => {
    setLoading(true);
    setErrorMsg('');
    setStatusMsg('');
    try {
      const result = await rollbackLiveOpsToSnapshot(user, activeConfig, entry);
      setActiveConfig(result.config);
      setDraft(result.config);
      setSource(result.source);
      setSnapshots(result.snapshots);
      onConfigPublished?.(result.config, result.source);
      setStatusMsg(
        `Đã khôi phục cấu hình từ v${entry.config.version} lên phiên bản mới v${result.config.version}.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Khôi phục cấu hình thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetDefaults = () => {
    setDraft({
      ...DEFAULT_LIVEOPS_CONFIG,
      version: activeConfig.version,
      balanceNote: 'Khôi phục thông số cân bằng gốc Mùa Tinh Giới.',
    });
  };

  const visibleIssues = showAllIssues ? glbReport.issues : glbReport.issues.slice(0, 6);

  return (
    <div className="mx-auto mt-6 max-w-6xl space-y-6">
      {/* Section 1: LiveOps Balance Controls */}
      <section
        aria-label="Điều chỉnh thông số LiveOps"
        className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-amber-300">
              <Sliders size={18} />
              <h2 className="text-base font-bold text-slate-100">
                Bảng Cân Bằng LiveOps Toàn Hệ Thống
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Đồng bộ tức thì qua Firestore &amp; Express với giới hạn an toàn biên cứng. Mọi bản xuất bản đều tự động lưu mốc lịch sử.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs tabular-nums">
            <div className="text-slate-300">
              Phiên bản hiện tại: <strong className="text-amber-300">v{activeConfig.version}</strong>
            </div>
            <div className="text-slate-400">
              Nguồn:{' '}
              <strong className={source === 'firestore' ? 'text-emerald-300' : 'text-sky-300'}>
                {source === 'firestore'
                  ? 'Firestore Realtime'
                  : source === 'server'
                  ? 'Máy chủ nội bộ'
                  : 'Bộ nhớ đệm'}
              </strong>
            </div>
            <div className="text-slate-400">
              Cập nhật: <strong className="text-slate-200">{formatTimeLabel(activeConfig.updatedAtMs)}</strong>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              { key: 'goldRewardMult', label: 'Hệ số Vàng thưởng', bounds: LIVEOPS_BOUNDS.goldRewardMult, step: 0.05 },
              { key: 'gemRewardMult', label: 'Hệ số Ngọc thưởng', bounds: LIVEOPS_BOUNDS.gemRewardMult, step: 0.05 },
              { key: 'forgeShardMult', label: 'Hệ số Mảnh Rèn', bounds: LIVEOPS_BOUNDS.forgeShardMult, step: 0.05 },
              { key: 'enemyHpMult', label: 'Hệ số Máu Quái/Boss', bounds: LIVEOPS_BOUNDS.enemyHpMult, step: 0.05 },
              { key: 'enemyDmgMult', label: 'Hệ số Sát thương Quái', bounds: LIVEOPS_BOUNDS.enemyDmgMult, step: 0.05 },
              { key: 'chestEpicRateBonus', label: 'Cộng tỷ lệ Sử Thi Rương', bounds: LIVEOPS_BOUNDS.chestEpicRateBonus, step: 0.01 },
            ] as const
          ).map(({ key, label, bounds, step }) => {
            const val = draft[key];
            return (
              <label key={key} className="block rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">{label}</span>
                  <span className="font-bold text-amber-300 tabular-nums">
                    {key === 'chestEpicRateBonus'
                      ? `${val >= 0 ? '+' : ''}${(val * 100).toFixed(1)}%`
                      : `×${val.toFixed(2)}`}
                  </span>
                </div>
                <input
                  type="range"
                  min={bounds.min}
                  max={bounds.max}
                  step={step}
                  disabled={busy}
                  value={val}
                  onChange={(e) => setDraft((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                  className="mt-2 w-full accent-amber-400"
                />
                <div className="mt-1 flex justify-between text-[11px] text-slate-500 tabular-nums">
                  <span>{key === 'chestEpicRateBonus' ? `${(bounds.min * 100).toFixed(0)}%` : `×${bounds.min}`}</span>
                  <span>{key === 'chestEpicRateBonus' ? `+${(bounds.max * 100).toFixed(0)}%` : `×${bounds.max}`}</span>
                </div>
              </label>
            );
          })}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="block rounded-xl border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">Dịch chuyển Pity Soft-Cap</span>
              <span className="font-bold text-sky-300 tabular-nums">
                {draft.pitySoftCapOffset >= 0 ? `+${draft.pitySoftCapOffset}` : draft.pitySoftCapOffset} lượt
              </span>
            </div>
            <input
              type="range"
              min={LIVEOPS_BOUNDS.pitySoftCapOffset.min}
              max={LIVEOPS_BOUNDS.pitySoftCapOffset.max}
              step={1}
              disabled={busy}
              value={draft.pitySoftCapOffset}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, pitySoftCapOffset: Math.round(Number(e.target.value)) }))
              }
              className="mt-2 w-full accent-sky-400"
            />
          </label>

          <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3 cursor-pointer">
            <div>
              <div className="text-xs font-semibold text-slate-200">Sự Kiện Tăng Tốc Cuối Tuần</div>
              <div className="text-[11px] text-slate-400">+15% Vàng toàn bộ chiến dịch</div>
            </div>
            <input
              type="checkbox"
              disabled={busy}
              checked={draft.weekendBlitzEnabled}
              onChange={(e) => setDraft((prev) => ({ ...prev, weekendBlitzEnabled: e.target.checked }))}
              className="h-4 w-4 accent-amber-400"
            />
          </label>

          <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3 cursor-pointer">
            <div>
              <div className="text-xs font-semibold text-slate-200">Sự Kiện Nhân Đôi Rơi Đồ</div>
              <div className="text-[11px] text-slate-400">+25% Mảnh Rèn sau mỗi trận</div>
            </div>
            <input
              type="checkbox"
              disabled={busy}
              checked={draft.doubleDropEventActive}
              onChange={(e) => setDraft((prev) => ({ ...prev, doubleDropEventActive: e.target.checked }))}
              className="h-4 w-4 accent-emerald-400"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="block">
            <span className="text-xs font-semibold text-slate-300">Thông báo sự kiện (Banner)</span>
            <input
              type="text"
              maxLength={180}
              disabled={busy}
              value={draft.announcementBanner}
              onChange={(e) => setDraft((prev) => ({ ...prev, announcementBanner: e.target.value }))}
              placeholder="Ví dụ: Tuần lễ Song Tử +25% Mảnh Rèn"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none focus:border-amber-400"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-300">Thông báo bảo trì</span>
            <input
              type="text"
              maxLength={180}
              disabled={busy}
              value={draft.maintenanceNotice}
              onChange={(e) => setDraft((prev) => ({ ...prev, maintenanceNotice: e.target.value }))}
              placeholder="Để trống nếu vận hành bình thường"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none focus:border-amber-400"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-300">Ghi chú phiên bản (lưu vào lịch sử)</span>
            <input
              type="text"
              maxLength={240}
              disabled={busy}
              value={draft.balanceNote}
              onChange={(e) => setDraft((prev) => ({ ...prev, balanceNote: e.target.value }))}
              placeholder="Mô tả ngắn thay đổi cân bằng"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none focus:border-amber-400"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
          <div className="text-xs text-slate-400 tabular-nums">
            {pendingDiffs.length > 0
              ? `Đang có ${pendingDiffs.length} thay đổi chưa xuất bản: ${pendingDiffs
                  .slice(0, 3)
                  .map((d) => `${d.label} (${d.before} → ${d.after})`)
                  .join(' · ')}`
              : 'Bản nháp trùng khớp với cấu hình đang hoạt động.'}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
            >
              <RotateCcw size={14} /> Đặt lại mặc định
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handlePublish()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-50"
            >
              <Save size={14} /> {busy ? 'Đang đồng bộ...' : `Xuất bản v${activeConfig.version + 1}`}
            </button>
          </div>
        </div>

        {statusMsg && (
          <p role="status" className="mt-3 text-xs font-semibold text-emerald-300">
            {statusMsg}
          </p>
        )}
        {errorMsg && (
          <p role="alert" className="mt-3 text-xs font-semibold text-rose-300">
            {errorMsg}
          </p>
        )}
      </section>

      {/* Section 2: Phase 4 Pillar 5 — Snapshot History & 1-Click Rollback */}
      <section
        aria-label="Lịch sử phiên bản và khôi phục 1 chạm"
        className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <History size={18} className="text-sky-300" />
            <h3 className="text-sm font-bold text-slate-100">
              Lịch Sử Phiên Bản &amp; Khôi Phục 1 Chạm (Rollback)
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-400 tabular-nums">
            {snapshots.length}/{MAX_LIVEOPS_SNAPSHOTS} mốc gần nhất
          </span>
        </div>

        {snapshots.length === 0 ? (
          <p className="mt-3 text-xs text-slate-400">
            Chưa có mốc lịch sử nào được lưu trên trình duyệt này. Khi bạn xuất bản cấu hình LiveOps, tối đa {MAX_LIVEOPS_SNAPSHOTS} mốc sẽ được tự động ghi nhận kèm so sánh hệ số và nút khôi phục 1 chạm.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-slate-800">
            {snapshots.map((entry) => {
              const diffsVsCurrent = computeLiveOpsConfigDiff(activeConfig, entry.config);
              const isIdentical = diffsVsCurrent.length === 0;
              return (
                <div
                  key={entry.snapshotId}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-3 text-xs tabular-nums">
                      <span className="font-bold text-amber-300">v{entry.config.version}</span>
                      <span className="font-semibold text-slate-100 truncate">{entry.label}</span>
                      <span className="text-slate-400">{formatTimeLabel(entry.savedAtMs)}</span>
                      <span className="text-slate-500">
                        ({entry.source === 'firestore' ? 'Firestore' : entry.source === 'server' ? 'Server' : 'Local'})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 tabular-nums">
                      {isIdentical
                        ? 'Khớp hoàn toàn với cấu hình đang hoạt động.'
                        : `Khác bản hiện tại: ${diffsVsCurrent
                            .slice(0, 4)
                            .map((d) => `${d.label}: ${d.before} → ${d.after}`)
                            .join(' · ')}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busy || isIdentical}
                    onClick={() => void handleRollback(entry)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-950/60 px-3 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-900/70 disabled:opacity-40"
                  >
                    <RotateCcw size={13} /> Khôi phục bản này
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 3: Phase 4 Pillar 4 — GLB High/Lite Pipeline Health Validator */}
      <section
        aria-label="Kiểm định sức khỏe kho GLB và ngân sách E5430"
        className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Database size={18} className="text-emerald-300" />
            <h3 className="text-sm font-bold text-slate-100">
              Kiểm Định Sức Khỏe Kho GLB &amp; Ngân Sách Dell Latitude E5430
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold">
            {glbReport.status === 'healthy' ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-300">
                <CheckCircle2 size={15} /> Đạt chuẩn E5430 · 0 lỗi
              </span>
            ) : glbReport.status === 'warning' ? (
              <span className="inline-flex items-center gap-1.5 text-amber-300">
                <AlertTriangle size={15} /> Cần lưu ý ({glbReport.issues.length} cảnh báo)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-rose-300">
                <ShieldAlert size={15} /> Có mục vượt ngưỡng E5430
              </span>
            )}
          </div>
        </div>

        {/* KPI Summary Grid */}
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
            <div className="text-[11px] font-semibold text-slate-400">Tệp GLB hoạt động</div>
            <div className="mt-1 text-lg font-bold text-slate-100 tabular-nums">
              {glbReport.activeFilesCount}{' '}
              <span className="text-xs font-normal text-slate-500">
                / {glbReport.totalManifestFiles} tổng
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400 tabular-nums">
              High: {glbReport.highCount} · Lite: {glbReport.liteCount}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
            <div className="text-[11px] font-semibold text-slate-400">Tỷ lệ đối cặp High / Lite</div>
            <div
              className={`mt-1 text-lg font-bold tabular-nums ${
                glbReport.pairCoveragePct >= 95
                  ? 'text-emerald-300'
                  : glbReport.pairCoveragePct >= 80
                  ? 'text-amber-300'
                  : 'text-rose-300'
              }`}
            >
              {glbReport.pairCoveragePct.toFixed(1)}%
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400 tabular-nums">
              {glbReport.pairedCount} cặp đầy đủ High + Lite
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
            <div className="text-[11px] font-semibold text-slate-400">Bản Lite lớn nhất</div>
            <div className="mt-1 text-lg font-bold text-sky-300 tabular-nums">
              {formatMb(glbReport.maxLiteBytes)}
            </div>
            <div className="mt-0.5 truncate text-[11px] text-slate-400" title={glbReport.maxLitePath ?? ''}>
              {glbReport.maxLitePath ? glbReport.maxLitePath.split('/').pop() : 'Không có'}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
            <div className="text-[11px] font-semibold text-slate-400">An toàn Intel HD 4000</div>
            <div
              className={`mt-1 flex items-center gap-1.5 text-lg font-bold ${
                glbReport.e5430Safe ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              <ShieldCheck size={17} />
              <span>{glbReport.e5430Safe ? 'An toàn' : 'Vượt trần'}</span>
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400 tabular-nums">
              Tổng gói Lite: {formatMb(glbReport.totalActiveLiteBytes)}
            </div>
          </div>
        </div>

        {/* Per-chapter Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="py-2 pr-3 font-semibold">Phân vùng</th>
                <th className="py-2 px-3 font-semibold text-right">Hoạt động</th>
                <th className="py-2 px-3 font-semibold text-right">High</th>
                <th className="py-2 px-3 font-semibold text-right">Lite</th>
                <th className="py-2 px-3 font-semibold text-right">Đủ cặp</th>
                <th className="py-2 px-3 font-semibold text-right">Lite lớn nhất</th>
                <th className="py-2 pl-3 font-semibold text-right">Tổng Lite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-200">
              {glbReport.chapters.map((row) => (
                <tr key={row.chapterLabel}>
                  <td className="py-2 pr-3 font-semibold text-slate-100">{row.chapterLabel}</td>
                  <td className="py-2 px-3 text-right">{row.activeCount}</td>
                  <td className="py-2 px-3 text-right">{row.highCount}</td>
                  <td className="py-2 px-3 text-right">{row.liteCount}</td>
                  <td className="py-2 px-3 text-right text-emerald-300 font-semibold">{row.pairedCount}</td>
                  <td className="py-2 px-3 text-right">{formatMb(row.maxLiteBytes)}</td>
                  <td className="py-2 pl-3 text-right text-slate-300">{formatMb(row.totalLiteBytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {glbReport.issues.length > 0 && (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-amber-300">
              <span>Chi tiết cảnh báo kiểm định ({glbReport.issues.length})</span>
              {glbReport.issues.length > 6 && (
                <button
                  type="button"
                  onClick={() => setShowAllIssues((v) => !v)}
                  className="text-sky-300 hover:underline"
                >
                  {showAllIssues ? 'Thu gọn' : `Xem toàn bộ ${glbReport.issues.length} mục`}
                </button>
              )}
            </div>
            <ul className="mt-2 space-y-1 text-[11px] text-slate-300">
              {visibleIssues.map((issue, idx) => (
                <li key={`${issue.code}_${issue.path}_${idx}`} className="flex items-start gap-2">
                  <span
                    className={
                      issue.severity === 'critical'
                        ? 'font-bold text-rose-400 shrink-0'
                        : 'font-bold text-amber-300 shrink-0'
                    }
                  >
                    {issue.severity === 'critical' ? '[NGHIÊM TRỌNG]' : '[LƯU Ý]'}
                  </span>
                  <span className="break-all">{issue.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Section 4: Server Security Anomaly Monitor (Read-only Admin Telemetry) */}
      <section
        aria-label="Giám sát bất thường và an ninh máy chủ"
        className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-amber-300" />
            <h3 className="text-sm font-bold text-slate-100">
              Giám Sát Bất Thường &amp; An Ninh Máy Chủ
            </h3>
          </div>
          <button
            type="button"
            disabled={anomalyLoading}
            onClick={() => void loadSecurityAnomalies()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw size={13} className={anomalyLoading ? 'animate-spin' : ''} />
            Làm mới
          </button>
        </div>

        {anomalyError ? (
          <p className="mt-3 text-xs text-rose-300">{anomalyError}</p>
        ) : !anomalyData ? (
          <p className="mt-3 text-xs text-slate-400">
            {anomalyLoading ? 'Đang tải dữ liệu giám sát an ninh...' : 'Chưa có dữ liệu giám sát.'}
          </p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4 tabular-nums">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div className="text-[11px] font-semibold text-slate-400">Chặn Rate Limit (429)</div>
                <div className="mt-1 text-lg font-bold text-amber-300">
                  {anomalyData.summary.countsByCategory.rate_limit}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div className="text-[11px] font-semibold text-slate-400">WS Payload Bị Kẹp Trần</div>
                <div className="mt-1 text-lg font-bold text-sky-300">
                  {anomalyData.summary.countsByCategory.ws_clamped}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div className="text-[11px] font-semibold text-slate-400">Token Không Hợp Lệ (401)</div>
                <div className="mt-1 text-lg font-bold text-orange-300">
                  {anomalyData.summary.countsByCategory.auth_invalid}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div className="text-[11px] font-semibold text-slate-400">Từ Chối Quyền Admin (403)</div>
                <div className="mt-1 text-lg font-bold text-rose-300">
                  {anomalyData.summary.countsByCategory.admin_denied}
                </div>
              </div>
            </div>

            {anomalyData.recent.length === 0 ? (
              <p className="mt-3 text-xs text-emerald-300">
                Không ghi nhận sự kiện bất thường nào kể từ lần khởi động máy chủ gần nhất (bộ đệm tối đa {anomalyData.summary.maxCapacity} sự kiện).
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs tabular-nums">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                      <th className="py-2 pr-3 font-semibold">Thời gian</th>
                      <th className="py-2 px-3 font-semibold">Loại</th>
                      <th className="py-2 px-3 font-semibold">Phạm vi</th>
                      <th className="py-2 px-3 font-semibold">Nguồn</th>
                      <th className="py-2 pl-3 font-semibold">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-slate-200">
                    {anomalyData.recent.map((evt) => (
                      <tr key={evt.id}>
                        <td className="py-2 pr-3 text-slate-400 whitespace-nowrap">
                          {formatTimeLabel(evt.ts)}
                        </td>
                        <td className="py-2 px-3 font-semibold text-amber-300 whitespace-nowrap">
                          {evt.category}
                        </td>
                        <td className="py-2 px-3 text-slate-300 whitespace-nowrap">{evt.scope}</td>
                        <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{evt.actor}</td>
                        <td className="py-2 pl-3 text-slate-300">{evt.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
