import React, { useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  RotateCcw,
  Save,
  Shield,
  Sliders,
  Upload,
  X,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import {
  DEFAULT_LIVEOPS_CONFIG,
  getEffectiveLiveOpsPityThresholds,
  LIVEOPS_BOUNDS,
  LIVEOPS_PRESETS,
  LiveOpsConfig,
  parseLiveOpsConfigJson,
  sanitizeLiveOpsConfig,
} from '../data/liveOpsConfig';
import { isVerifiedAdminUser, saveLiveOpsConfigAsAdmin } from '../services/liveOpsConfigService';

interface AdminLiveOpsModalProps {
  authUser: User | null;
  activeConfig: LiveOpsConfig;
  configSource: 'firestore' | 'server' | 'local';
  onConfigUpdated: (nextConfig: LiveOpsConfig) => void;
  onClose: () => void;
}

export const AdminLiveOpsModal: React.FC<AdminLiveOpsModalProps> = ({
  authUser,
  activeConfig,
  configSource,
  onConfigUpdated,
  onClose,
}) => {
  const [draft, setDraft] = useState<LiveOpsConfig>(() => sanitizeLiveOpsConfig(activeConfig));
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');

  const isAdmin = isVerifiedAdminUser(authUser);
  const pityPreview = useMemo(() => getEffectiveLiveOpsPityThresholds(draft), [draft]);

  if (!isAdmin) {
    return null;
  }

  const updateField = <K extends keyof LiveOpsConfig>(key: K, value: LiveOpsConfig[K]) => {
    setDraft((prev) => sanitizeLiveOpsConfig({ ...prev, [key]: value }));
    setStatusMsg(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await saveLiveOpsConfigAsAdmin(authUser, draft);
      setDraft(res.config);
      onConfigUpdated(res.config);
      soundEngine.playLevelUp();
      setStatusMsg({
        kind: 'ok',
        text: `Đã xuất bản cấu hình LiveOps v${res.config.version} (${res.syncedTargets.join(' + ')}). Áp dụng tức thì cho các trận và phần thưởng tiếp theo.`,
      });
    } catch (err) {
      soundEngine.playUiClick(0.75);
      setStatusMsg({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Không thể lưu cấu hình LiveOps.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyJson = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(JSON.stringify(draft, null, 2));
      }
      soundEngine.playUiClick(1.08);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadJson = () => {
    soundEngine.playUiClick(1.05);
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
      setStatusMsg({ kind: 'err', text: parsed.error });
      return;
    }
    setDraft({ ...parsed.config, version: draft.version });
    setImportOpen(false);
    setImportText('');
    soundEngine.playUiClick(1.1);
    setStatusMsg({
      kind: 'ok',
      text: 'Đã nạp bản nháp từ JSON. Nhấn "Xuất Bản Cấu Hình" để đồng bộ toàn hệ thống.',
    });
  };

  const sliderConfigs: Array<{
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
      label: 'Hệ số Máu Quái & Boss',
      min: LIVEOPS_BOUNDS.enemyHpMult.min,
      max: LIVEOPS_BOUNDS.enemyHpMult.max,
      step: 0.05,
      format: (v) => `${v.toFixed(2)}x`,
    },
    {
      key: 'enemyDmgMult',
      label: 'Hệ số Sát Thương Quái & Boss',
      min: LIVEOPS_BOUNDS.enemyDmgMult.min,
      max: LIVEOPS_BOUNDS.enemyDmgMult.max,
      step: 0.05,
      format: (v) => `${v.toFixed(2)}x`,
    },
    {
      key: 'chestEpicRateBonus',
      label: 'Điều chỉnh Tỷ lệ Sử Thi Rương',
      min: LIVEOPS_BOUNDS.chestEpicRateBonus.min,
      max: LIVEOPS_BOUNDS.chestEpicRateBonus.max,
      step: 0.01,
      format: (v) => `${v >= 0 ? '+' : ''}${Math.round(v * 100)}%`,
    },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-[#040611]/92">
      <div className="cel-panel-ornate w-full max-w-2xl rounded-3xl p-5 sm:p-6 max-h-[92vh] flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-amber-400/25 pb-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/45 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base sm:text-lg font-black text-amber-200 truncate">
                Bảng Quản Trị &amp; Cân Bằng LiveOps
              </h2>
              <p className="text-[11px] text-slate-400 font-mono-nums truncate">
                Quản trị viên: {authUser?.email} · Phiên bản v{activeConfig.version} · Nguồn:{' '}
                {configSource.toUpperCase()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(0.9);
              onClose();
            }}
            aria-label="Đóng bảng LiveOps"
            className="cel-panel w-8 h-8 rounded-xl flex items-center justify-center text-slate-200 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto a2-scroll space-y-4 pr-1">
          {/* Quick Presets */}
          <div className="space-y-2">
            <div className="text-[11px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              <span>Cấu Hình Mẫu Nhanh (Safe Presets)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {LIVEOPS_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick(1.06);
                    setDraft((prev) => sanitizeLiveOpsConfig({ ...prev, ...preset.patch }));
                    setStatusMsg(null);
                  }}
                  className="text-left rounded-xl bg-[#080d1e] border border-slate-700/80 hover:border-amber-400/60 p-2.5 cursor-pointer transition-colors"
                >
                  <div className="text-xs font-black text-white leading-snug">{preset.label}</div>
                  <div className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    {preset.summary}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Numeric Multipliers */}
          <div className="rounded-2xl bg-[#070c1b] border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                Tinh Chỉnh Hệ Số Cân Bằng Động (Áp Dụng Tiếp Theo · Giữ Nguyên Save Cũ)
              </span>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick(0.95);
                  setDraft({ ...DEFAULT_LIVEOPS_CONFIG, version: draft.version });
                  setStatusMsg(null);
                }}
                className="text-[11px] font-bold text-slate-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Về Mặc Định 1.0x</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sliderConfigs.map((cfg) => {
                const value = draft[cfg.key];
                return (
                  <div key={cfg.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-200 font-semibold">{cfg.label}</span>
                      <span className="font-mono-nums font-black text-amber-200">
                        {cfg.format(value)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={cfg.min}
                      max={cfg.max}
                      step={cfg.step}
                      value={value}
                      onChange={(e) => updateField(cfg.key, Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-900 rounded-lg"
                    />
                  </div>
                );
              })}
            </div>

            {/* Pity Soft-Cap Offset */}
            <div className="pt-2 border-t border-slate-800/80 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-200 font-semibold">
                  Dịch chuyển ngưỡng Bảo Hiểm Pity ({LIVEOPS_BOUNDS.pitySoftCapOffset.min} .. +
                  {LIVEOPS_BOUNDS.pitySoftCapOffset.max} lượt)
                </span>
                <span className="font-mono-nums font-black text-sky-300">
                  Sử Thi: {pityPreview.epicPityRolls} lượt · [S]: {pityPreview.sTierPityRolls} lượt
                </span>
              </div>
              <input
                type="range"
                min={LIVEOPS_BOUNDS.pitySoftCapOffset.min}
                max={LIVEOPS_BOUNDS.pitySoftCapOffset.max}
                step={1}
                value={draft.pitySoftCapOffset}
                onChange={(e) => updateField('pitySoftCapOffset', Number(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer h-2 bg-slate-900 rounded-lg"
              />
            </div>
          </div>

          {/* Event Feature Flags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="rounded-xl bg-[#080d1e] border border-slate-800 px-3.5 py-2.5 flex items-center justify-between gap-2 cursor-pointer">
              <div>
                <div className="text-xs font-bold text-white">Sự Kiện Rơi Mảnh Tăng Cường</div>
                <div className="text-[10px] text-slate-400">
                  Nhân thêm 1.5x Mảnh Rèn (giới hạn trần 3.0x)
                </div>
              </div>
              <input
                type="checkbox"
                checked={draft.doubleDropEventActive}
                onChange={(e) => updateField('doubleDropEventActive', e.target.checked)}
                className="w-4 h-4 accent-amber-400 cursor-pointer"
              />
            </label>
            <label className="rounded-xl bg-[#080d1e] border border-slate-800 px-3.5 py-2.5 flex items-center justify-between gap-2 cursor-pointer">
              <div>
                <div className="text-xs font-bold text-white">Mở Boss Cuối Tuần (Weekend Blitz)</div>
                <div className="text-[10px] text-slate-400">
                  Bật/tắt truy cập nhanh sự kiện Boss Cuối Tuần
                </div>
              </div>
              <input
                type="checkbox"
                checked={draft.weekendBlitzEnabled}
                onChange={(e) => updateField('weekendBlitzEnabled', e.target.checked)}
                className="w-4 h-4 accent-amber-400 cursor-pointer"
              />
            </label>
          </div>

          {/* Broadcast Banners & Balance Note */}
          <div className="rounded-2xl bg-[#070c1b] border border-slate-800 p-4 space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-amber-200 block">
                Thông Báo Sự Kiện Toàn Sảnh (để trống để ẩn)
              </label>
              <input
                type="text"
                maxLength={LIVEOPS_BOUNDS.maxBannerLen}
                value={draft.announcementBanner}
                onChange={(e) => updateField('announcementBanner', e.target.value)}
                placeholder="Ví dụ: Sự kiện Cuối Tuần +50% Vàng & Mảnh Rèn đến hết Chủ Nhật..."
                className="w-full rounded-xl bg-[#040712] border border-slate-700 focus:border-amber-300 outline-none px-3 py-2 text-xs text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-rose-200 block">
                Cảnh Báo Bảo Trì / Lưu Ý Quan Trọng (để trống để ẩn)
              </label>
              <input
                type="text"
                maxLength={LIVEOPS_BOUNDS.maxBannerLen}
                value={draft.maintenanceNotice}
                onChange={(e) => updateField('maintenanceNotice', e.target.value)}
                placeholder="Ví dụ: Máy chủ bảo trì định kỳ lúc 02:00 UTC+7 trong 15 phút..."
                className="w-full rounded-xl bg-[#040712] border border-slate-700 focus:border-rose-400 outline-none px-3 py-2 text-xs text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 block">
                Ghi Chú Phiên Bản Cân Bằng (Audit Trail)
              </label>
              <input
                type="text"
                maxLength={LIVEOPS_BOUNDS.maxNoteLen}
                value={draft.balanceNote}
                onChange={(e) => updateField('balanceNote', e.target.value)}
                className="w-full rounded-xl bg-[#040712] border border-slate-700 focus:border-sky-300 outline-none px-3 py-2 text-xs text-slate-200"
              />
            </div>
          </div>

          {/* JSON Export / Import */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyJson}
              className="a2-slate-btn px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-300" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span>{copied ? 'Đã Sao Chép JSON' : 'Sao Chép JSON'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadJson}
              className="a2-slate-btn px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-sky-300" />
              <span>Tải Bản Sao Lưu</span>
            </button>
            <button
              type="button"
              onClick={() => setImportOpen((v) => !v)}
              className="a2-slate-btn px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5 text-purple-300" />
              <span>Nhập JSON / Rollback</span>
            </button>
          </div>

          {importOpen && (
            <div className="rounded-xl bg-[#080d1e] border border-purple-400/35 p-3 space-y-2">
              <textarea
                rows={4}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Dán nội dung JSON cấu hình LiveOps đã sao lưu..."
                className="w-full rounded-lg bg-[#040712] border border-slate-700 p-2 text-[11px] font-mono text-slate-200 outline-none resize-none"
              />
              <button
                type="button"
                onClick={handleApplyImport}
                disabled={!importText.trim()}
                className="a2-slate-btn px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer disabled:opacity-50"
              >
                Nạp Bản Nháp Từ JSON
              </button>
            </div>
          )}

          {statusMsg && (
            <div
              className={`rounded-xl px-3.5 py-2.5 text-xs font-bold flex items-start gap-2 border ${
                statusMsg.kind === 'ok'
                  ? 'bg-emerald-500/15 border-emerald-400/45 text-emerald-200'
                  : 'bg-rose-500/15 border-rose-400/45 text-rose-200'
              }`}
            >
              {statusMsg.kind === 'ok' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-amber-400/20 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(0.9);
              onClose();
            }}
            className="a2-slate-btn px-4 py-2 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="a2-yellow-btn px-5 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer whitespace-nowrap disabled:opacity-60"
          >
            <Save className="w-4 h-4 shrink-0" />
            <span>{saving ? 'Đang Xuất Bản…' : 'Xuất Bản Cấu Hình LiveOps'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
