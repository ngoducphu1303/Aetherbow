import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Check,
  Copy,
  Download,
  RotateCcw,
  Save,
  Sliders,
  Upload,
} from 'lucide-react';
import {
  DEFAULT_LIVEOPS_CONFIG,
  getEffectiveLiveOpsPityThresholds,
  LIVEOPS_BOUNDS,
  LIVEOPS_PRESETS,
  type LiveOpsConfig,
  parseLiveOpsConfigJson,
  sanitizeLiveOpsConfig,
} from '../data/liveOpsConfig';
import {
  getCachedLiveOpsConfig,
  saveLiveOpsConfigAsAdmin,
  subscribeLiveOpsConfig,
} from '../services/liveOpsConfigService';
import { primary, secondary } from './assetAdminApi';

interface AssetAdminLiveOpsTabProps {
  user: User;
  onBusyChange?: (busy: boolean) => void;
}

export default function AssetAdminLiveOpsTab({
  user,
  onBusyChange,
}: AssetAdminLiveOpsTabProps) {
  const [source, setSource] = useState<'firestore' | 'server' | 'local'>('local');
  const [draft, setDraft] = useState<LiveOpsConfig>(() =>
    sanitizeLiveOpsConfig(getCachedLiveOpsConfig())
  );
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');

  useEffect(() => {
    const unsub = subscribeLiveOpsConfig((cfg, nextSource) => {
      setSource(nextSource);
      setDraft((prev) => (cfg.version >= prev.version ? sanitizeLiveOpsConfig(cfg) : prev));
    });
    return () => unsub();
  }, []);

  const pityPreview = useMemo(() => getEffectiveLiveOpsPityThresholds(draft), [draft]);

  const updateField = <K extends keyof LiveOpsConfig>(key: K, value: LiveOpsConfig[K]) => {
    setDraft((prev) => sanitizeLiveOpsConfig({ ...prev, [key]: value }));
    setNotice('');
    setError('');
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    onBusyChange?.(true);
    setNotice('');
    setError('');
    try {
      const res = await saveLiveOpsConfigAsAdmin(user, draft, {
        allowLinkedAssetAdmin: true,
      });
      setDraft(res.config);
      setNotice(
        `Đã xuất bản LiveOps v${res.config.version} (${res.syncedTargets.join(' + ')}). Áp dụng tức thì cho toàn bộ máy chủ & trận đấu tiếp theo.`
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lưu cấu hình LiveOps.');
    } finally {
      setSaving(false);
      onBusyChange?.(false);
    }
  };

  const handleCopyJson = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(JSON.stringify(draft, null, 2));
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `aetherbow-liveops-v${draft.version}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleApplyImport = () => {
    const parsed = parseLiveOpsConfigJson(importText);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setDraft({ ...parsed.config, version: draft.version });
    setImportOpen(false);
    setImportText('');
    setError('');
    setNotice('Đã nạp bản nháp từ JSON. Nhấn "Xuất bản LiveOps" để đồng bộ.');
  };

  const sliders: Array<{
    key:
      | 'goldRewardMult'
      | 'gemRewardMult'
      | 'forgeShardMult'
      | 'enemyHpMult'
      | 'enemyDmgMult'
      | 'chestEpicRateBonus';
    label: string;
    min: number;
    max: number;
    step: number;
    format: (v: number) => string;
  }> = [
    {
      key: 'goldRewardMult',
      label: 'Hệ số thưởng Vàng',
      min: LIVEOPS_BOUNDS.goldRewardMult.min,
      max: LIVEOPS_BOUNDS.goldRewardMult.max,
      step: 0.05,
      format: (v) => `${v.toFixed(2)}x`,
    },
    {
      key: 'gemRewardMult',
      label: 'Hệ số thưởng Ngọc Hồn',
      min: LIVEOPS_BOUNDS.gemRewardMult.min,
      max: LIVEOPS_BOUNDS.gemRewardMult.max,
      step: 0.05,
      format: (v) => `${v.toFixed(2)}x`,
    },
    {
      key: 'forgeShardMult',
      label: 'Hệ số Mảnh Rèn & Bản Vẽ [S]',
      min: LIVEOPS_BOUNDS.forgeShardMult.min,
      max: LIVEOPS_BOUNDS.forgeShardMult.max,
      step: 0.05,
      format: (v) => `${v.toFixed(2)}x`,
    },
    {
      key: 'enemyHpMult',
      label: 'Hệ số Sinh lực Quái & Boss',
      min: LIVEOPS_BOUNDS.enemyHpMult.min,
      max: LIVEOPS_BOUNDS.enemyHpMult.max,
      step: 0.05,
      format: (v) => `${v.toFixed(2)}x`,
    },
    {
      key: 'enemyDmgMult',
      label: 'Hệ số Sát thương Quái & Boss',
      min: LIVEOPS_BOUNDS.enemyDmgMult.min,
      max: LIVEOPS_BOUNDS.enemyDmgMult.max,
      step: 0.05,
      format: (v) => `${v.toFixed(2)}x`,
    },
    {
      key: 'chestEpicRateBonus',
      label: 'Cộng thêm tỷ lệ Rương Sử Thi',
      min: LIVEOPS_BOUNDS.chestEpicRateBonus.min,
      max: LIVEOPS_BOUNDS.chestEpicRateBonus.max,
      step: 0.01,
      format: (v) => `${v >= 0 ? '+' : ''}${Math.round(v * 100)}%`,
    },
  ];

  return (
    <section
      aria-label="Cân bằng LiveOps"
      className="mx-auto mt-6 max-w-6xl space-y-5 rounded-2xl border border-slate-800 bg-slate-900/90 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-100">
            <Sliders size={18} className="text-amber-300" />
            <span>Điều Chỉnh Cân Bằng LiveOps</span>
          </h2>
          <p className="text-xs text-slate-400 tabular-nums">
            Phiên bản hiện hành: v{draft.version} · Nguồn đồng bộ:{' '}
            {source === 'firestore'
              ? 'Cloud Firestore'
              : source === 'server'
              ? 'Máy chủ Express'
              : 'Bộ nhớ cục bộ'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={secondary} disabled={saving} onClick={() => void handleCopyJson()}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            <span className="whitespace-nowrap">{copied ? 'Đã sao chép' : 'Sao chép JSON'}</span>
          </button>
          <button type="button" className={secondary} disabled={saving} onClick={handleDownloadJson}>
            <Download size={15} />
            <span className="whitespace-nowrap">Tải JSON</span>
          </button>
          <button
            type="button"
            className={secondary}
            disabled={saving}
            onClick={() => setImportOpen((prev) => !prev)}
          >
            <Upload size={15} />
            <span className="whitespace-nowrap">{importOpen ? 'Đóng nạp JSON' : 'Nạp JSON'}</span>
          </button>
          <button
            type="button"
            className={secondary}
            disabled={saving}
            onClick={() => {
              setDraft({ ...DEFAULT_LIVEOPS_CONFIG, version: draft.version });
              setNotice('Đã đặt lại về mặc định cân bằng AAA. Nhấn Xuất bản để áp dụng.');
              setError('');
            }}
          >
            <RotateCcw size={15} />
            <span className="whitespace-nowrap">Mặc định</span>
          </button>
        </div>
      </div>

      {importOpen && (
        <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-950 p-4">
          <label htmlFor="asset-liveops-import" className="block text-xs font-semibold text-slate-300">
            Dán cấu hình LiveOps JSON để nạp nhanh
          </label>
          <textarea
            id="asset-liveops-import"
            rows={4}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder='{"goldRewardMult": 1.25, "doubleDropEventActive": true}'
            className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 font-mono text-xs text-slate-100 outline-none focus:border-amber-300"
          />
          <button type="button" className={primary} onClick={handleApplyImport}>
            Áp dụng bản nháp JSON
          </button>
        </div>
      )}

      {/* Presets */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Kịch bản vận hành nhanh
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {LIVEOPS_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              disabled={saving}
              onClick={() => {
                setDraft(sanitizeLiveOpsConfig({ ...draft, ...preset.patch }));
                setNotice(`Đã chọn kịch bản "${preset.label}". Nhấn Xuất bản để đồng bộ.`);
                setError('');
              }}
              className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-left transition-colors hover:border-amber-400/50 disabled:opacity-50"
            >
              <div className="text-sm font-bold text-amber-200">{preset.label}</div>
              <div className="mt-0.5 text-xs text-slate-400">{preset.summary}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Multipliers Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {sliders.map((item) => {
          const val = draft[item.key];
          return (
            <label
              key={item.key}
              className="block space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3.5"
            >
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-slate-200">{item.label}</span>
                <span className="font-mono font-bold text-amber-300 tabular-nums">
                  {item.format(val)}
                </span>
              </div>
              <input
                type="range"
                min={item.min}
                max={item.max}
                step={item.step}
                value={val}
                disabled={saving}
                onChange={(e) => updateField(item.key, Number(e.target.value))}
                className="w-full accent-amber-300"
              />
              <div className="flex justify-between text-[11px] text-slate-500 tabular-nums">
                <span>{item.format(item.min)}</span>
                <span>{item.format(item.max)}</span>
              </div>
            </label>
          );
        })}
      </div>

      {/* Pity & Event Switches */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-200">Điều chỉnh ngưỡng Bảo Hiểm Rương (Pity)</span>
            <span className="font-mono font-bold text-amber-300 tabular-nums">
              {draft.pitySoftCapOffset >= 0 ? `+${draft.pitySoftCapOffset}` : draft.pitySoftCapOffset}
            </span>
          </div>
          <input
            type="range"
            min={LIVEOPS_BOUNDS.pitySoftCapOffset.min}
            max={LIVEOPS_BOUNDS.pitySoftCapOffset.max}
            step={1}
            value={draft.pitySoftCapOffset}
            disabled={saving}
            onChange={(e) => updateField('pitySoftCapOffset', Number(e.target.value))}
            className="w-full accent-amber-300"
          />
          <p className="text-xs text-slate-400 tabular-nums">
            Ngưỡng hiệu lực: Sử Thi {pityPreview.epicPityRolls} lượt · Rương S {pityPreview.sTierPityRolls} lượt
          </p>
        </div>

        <div className="space-y-2.5 rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
          <p className="text-sm font-semibold text-slate-200">Công tắc sự kiện toàn hệ thống</p>
          <label className="flex items-center justify-between gap-3 text-sm text-slate-300">
            <span>Bật Đua Boss Cuối Tuần (Weekend Blitz)</span>
            <input
              type="checkbox"
              checked={draft.weekendBlitzEnabled}
              disabled={saving}
              onChange={(e) => updateField('weekendBlitzEnabled', e.target.checked)}
              className="h-4 w-4 accent-amber-300"
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm text-slate-300">
            <span>Sự kiện Nhân Đôi Rơi Đồ (Double Drop)</span>
            <input
              type="checkbox"
              checked={draft.doubleDropEventActive}
              disabled={saving}
              onChange={(e) => updateField('doubleDropEventActive', e.target.checked)}
              className="h-4 w-4 accent-amber-300"
            />
          </label>
        </div>
      </div>

      {/* Notices */}
      <div className="grid gap-3 md:grid-cols-3">
        <label className="block space-y-1 text-xs">
          <span className="font-semibold text-slate-300">Thông báo sảnh chờ</span>
          <input
            type="text"
            maxLength={180}
            value={draft.announcementBanner}
            disabled={saving}
            onChange={(e) => updateField('announcementBanner', e.target.value)}
            placeholder="Ví dụ: Tuần lễ Khai Hỏa Chương 4 · x1.5 Mảnh Rèn"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-300"
          />
        </label>
        <label className="block space-y-1 text-xs">
          <span className="font-semibold text-slate-300">Cảnh báo bảo trì</span>
          <input
            type="text"
            maxLength={180}
            value={draft.maintenanceNotice}
            disabled={saving}
            onChange={(e) => updateField('maintenanceNotice', e.target.value)}
            placeholder="Để trống nếu vận hành bình thường"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-300"
          />
        </label>
        <label className="block space-y-1 text-xs">
          <span className="font-semibold text-slate-300">Ghi chú phiên bản cân bằng</span>
          <input
            type="text"
            maxLength={240}
            value={draft.balanceNote}
            disabled={saving}
            onChange={(e) => updateField('balanceNote', e.target.value)}
            placeholder="Ghi chú nội bộ cho đội vận hành"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-300"
          />
        </label>
      </div>

      {/* Save Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
        <div className="min-w-0 flex-1">
          {notice && (
            <p role="status" className="text-sm text-emerald-300">
              {notice}
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-rose-300">
              {error}
            </p>
          )}
        </div>
        <button
          type="button"
          className={primary}
          disabled={saving}
          onClick={() => void handleSave()}
        >
          <Save size={16} />
          <span className="whitespace-nowrap">
            {saving ? 'Đang xuất bản…' : 'Xuất bản LiveOps'}
          </span>
        </button>
      </div>
    </section>
  );
}
