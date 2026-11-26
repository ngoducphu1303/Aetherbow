import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Cpu,
  Download,
  Gamepad2,
  HardDrive,
  Keyboard,
  Layers,
  Monitor,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { triggerHapticPulse } from '../engine/aaaWave4Director';
import {
  COMBAT_KEYBIND_META,
  DEFAULT_COMBAT_KEYBINDS,
  formatKeybindShortLabel,
  normalizeCombatKeybinds,
  remapCombatKeybind,
} from '../engine/aaaWave6Director';
import {
  evaluatePlaytestKpis,
  normalizeHeroMastery,
  normalizePlaytestMetrics,
} from '../data/earlyProgressionData';
import { evaluateEquippedGearSets } from '../data/gearData';
import { HERO_MAP } from '../data/heroesData';
import { decodeSaveTransferCode, encodeSaveTransferCode, encodeSignedSaveJson } from '../data/phase5Data';
import { SKILL_SYNERGIES, SKILL_SYNERGY_MAP } from '../data/skillsData';
import {
  Chapter1MapMode,
  CombatCameraPreset,
  CombatKeybindAction,
  FrameBenchmarkLiveSnapshot,
  FrameBenchmarkReport,
  GameSettings,
  GpuProfileSummary,
  GraphicsQuality,
  HudScaleMode,
  LowEndSafetyMode,
  SaveData,
  SaveTransferPreview,
} from '../types/game';
import { resolveSystemLiteBudget } from '../engine/aaaVisualPipeline';
import {
  isLowEndSafetyModeActive,
  resolveChapter1MapVariant,
} from '../engine/gpuSafetyGuard';
import {
  listSaveRollbackSnapshots,
  loadLocalRollbackVault,
  recordLocalRollbackSnapshot,
  restoreSaveRollbackSnapshot,
  SAVE_ROLLBACK_MAX_SNAPSHOTS,
} from '../data/wave17EndgameAndBackup';

interface SettingsModalProps {
  settings: GameSettings;
  muted: boolean;
  save?: SaveData;
  gpuProfile?: GpuProfileSummary;
  onResetGpuCrashGuard?: () => void;
  onUpdateSettings: (patch: Partial<GameSettings>) => void;
  onToggleMute: () => void;
  onReplayTutorial?: () => void;
  onResetPlaytestMetrics?: () => void;
  onImportSave?: (nextSave: SaveData) => void;
  onResetPlayerData?: () => Promise<void> | void;
  isVerifiedAdmin?: boolean;
  onOpenAdminLiveOps?: () => void;
  onStartFrameBenchmark?: (
    durationSec: number,
    onComplete: (report: FrameBenchmarkReport) => void
  ) => void;
  onStopFrameBenchmark?: () => FrameBenchmarkReport | null;
  onPollFrameBenchmark?: () => FrameBenchmarkLiveSnapshot | null;
  initialBenchmarkReport?: FrameBenchmarkReport | null;
  onClose: () => void;
}

const BOSS_LABELS: Array<{ key: string; label: string }> = [
  { key: 'ch1_ares', label: 'Ch.1-4 · Tướng Quân Ares' },
  { key: 'ch1_boreas', label: 'Ch.1-8 · Tướng Quân Boreas' },
  { key: 'ch1_leo_king', label: 'Ch.1-12 · Sư Vương Thái Dương' },
  { key: 'ch2_aries_boss', label: 'Ch.2-12 · Hỏa Dương Chiến Vương' },
  { key: 'ch3_taurus_boss', label: 'Ch.3-12 · Kim Ngưu Cự Thần' },
  { key: 'ch4_gemini_boss', label: 'Ch.4-12 · Song Tử Ảo Ảnh Vương' },
  { key: 'ch5_cancer_boss', label: 'Ch.5-12 · Cự Giải Thiết Giáp Vương' },
  { key: 'ch6_virgo_boss', label: 'Ch.6-12 · Xử Nữ Thánh Kiếm' },
  { key: 'ch7_libra_boss', label: 'Ch.7-12 · Thiên Bình Thẩm Phán' },
  { key: 'ch8_scorpio_boss', label: 'Ch.8-12 · Hổ Cáp Ám Đế' },
  { key: 'ch9_sagittarius_boss', label: 'Ch.9-12 · Nhân Mã Thần Tiễn' },
  { key: 'ch10_capricorn_boss', label: 'Ch.10-12 · Sơn Thần Ma Kết' },
  { key: 'ch11_aquarius_boss', label: 'Ch.11-12 · Thủy Sứ Bảo Bình' },
  { key: 'ch12_pisces_boss', label: 'Ch.12-12 · Song Ngư Mộng Chủ' },
];

const FUNNEL_STAGES = [1, 2, 4, 8, 12];

function formatDurationSec(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}p ${rem.toString().padStart(2, '0')}s`;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  muted,
  save,
  gpuProfile,
  onResetGpuCrashGuard,
  onUpdateSettings,
  onToggleMute,
  onReplayTutorial,
  onResetPlaytestMetrics,
  onImportSave,
  onResetPlayerData,
  isVerifiedAdmin,
  onOpenAdminLiveOps,
  onStartFrameBenchmark,
  onStopFrameBenchmark,
  onPollFrameBenchmark,
  initialBenchmarkReport = null,
  onClose,
}) => {
  const [benchLive, setBenchLive] = useState<FrameBenchmarkLiveSnapshot | null>(() =>
    onPollFrameBenchmark ? onPollFrameBenchmark() : null
  );
  const [benchReport, setBenchReport] = useState<FrameBenchmarkReport | null>(
    initialBenchmarkReport
  );
  const [benchCopied, setBenchCopied] = useState(false);

  useEffect(() => {
    if (!benchLive?.running || !onPollFrameBenchmark) return;
    const id = window.setInterval(() => {
      const snap = onPollFrameBenchmark();
      if (snap) setBenchLive(snap);
    }, 250);
    return () => window.clearInterval(id);
  }, [benchLive?.running, onPollFrameBenchmark]);

  const handleStartBench = (durationSec: number) => {
    if (!onStartFrameBenchmark) return;
    soundEngine.playUiClick(1.06);
    setBenchCopied(false);
    onStartFrameBenchmark(durationSec, (report) => {
      setBenchReport(report);
      setBenchLive(onPollFrameBenchmark ? onPollFrameBenchmark() : null);
    });
    const snap = onPollFrameBenchmark ? onPollFrameBenchmark() : null;
    if (snap) setBenchLive(snap);
  };

  const handleStopBench = () => {
    if (!onStopFrameBenchmark) return;
    soundEngine.playUiClick(0.95);
    const report = onStopFrameBenchmark();
    if (report) setBenchReport(report);
    const snap = onPollFrameBenchmark ? onPollFrameBenchmark() : null;
    if (snap) setBenchLive(snap);
  };

  const handleCopyBenchJson = async () => {
    if (!benchReport) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(benchReport, null, 2));
      setBenchCopied(true);
      soundEngine.playUiClick(1.1);
      window.setTimeout(() => setBenchCopied(false), 2200);
    } catch {
      setBenchCopied(false);
    }
  };

  const handleDownloadBenchJson = () => {
    if (!benchReport) return;
    soundEngine.playUiClick(1.08);
    const blob = new Blob([JSON.stringify(benchReport, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aetherbow-e5430-benchmark-${benchReport.durationRequestedSec}s.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const [showPlaytestKpi, setShowPlaytestKpi] = useState(false);
  const [showSaveTransfer, setShowSaveTransfer] = useState(false);
  const [kpiTab, setKpiTab] = useState<'kpi' | 'history'>('kpi');
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedSaveCode, setCopiedSaveCode] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [resettingData, setResettingData] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [importPending, setImportPending] = useState<{
    save: SaveData;
    preview: SaveTransferPreview;
  } | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  // Wave 17: Local Save Snapshot & Rollback Vault (max 5 FNV-1a checksummed snapshots)
  const [rollbackTick, setRollbackTick] = useState(0);
  const [confirmRollbackId, setConfirmRollbackId] = useState<string | null>(null);
  const [rollbackNotice, setRollbackNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const rollbackSnapshots = useMemo(
    () => listSaveRollbackSnapshots(loadLocalRollbackVault()),
    [rollbackTick, showSaveTransfer]
  );
  const [confirmHeavyMapOverride, setConfirmHeavyMapOverride] = useState(false);
  const [confirmDisableLiteOnLowEnd, setConfirmDisableLiteOnLowEnd] = useState(false);
  const [gamepadLabel, setGamepadLabel] = useState<string | null>(null);
  const [capturingKeyAction, setCapturingKeyAction] = useState<CombatKeybindAction | null>(null);
  const [keybindNotice, setKeybindNotice] = useState<string | null>(null);

  const activeKeybinds = normalizeCombatKeybinds(settings.keybinds);

  useEffect(() => {
    if (!capturingKeyAction) return undefined;
    const onCaptureKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        soundEngine.playUiClick(0.88);
        setCapturingKeyAction(null);
        setKeybindNotice(null);
        return;
      }
      const next = remapCombatKeybind(activeKeybinds, capturingKeyAction, e.code);
      if (next[capturingKeyAction] !== e.code) {
        soundEngine.playUiClick(0.75);
        setKeybindNotice('Phím di chuyển (WASD/Mũi tên) hoặc phím hệ thống không thể gán.');
        return;
      }
      soundEngine.playUiClick(1.12);
      onUpdateSettings({ keybinds: next });
      setCapturingKeyAction(null);
      setKeybindNotice(null);
    };
    window.addEventListener('keydown', onCaptureKey, true);
    return () => window.removeEventListener('keydown', onCaptureKey, true);
  }, [capturingKeyAction, activeKeybinds, onUpdateSettings]);

  useEffect(() => {
    const readGamepad = () => {
      if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
        setGamepadLabel(null);
        return;
      }
      const pads = navigator.getGamepads();
      for (let i = 0; i < pads.length; i++) {
        const gp = pads[i];
        if (gp && gp.connected) {
          setGamepadLabel(gp.id || `Tay cầm #${i + 1}`);
          return;
        }
      }
      setGamepadLabel(null);
    };

    readGamepad();
    window.addEventListener('gamepadconnected', readGamepad);
    window.addEventListener('gamepaddisconnected', readGamepad);
    return () => {
      window.removeEventListener('gamepadconnected', readGamepad);
      window.removeEventListener('gamepaddisconnected', readGamepad);
    };
  }, []);

  const qualityOptions: Array<{ id: GraphicsQuality; label: string; hint: string }> = [
    { id: 'low', label: 'Thấp', hint: 'Tối ưu FPS' },
    { id: 'medium', label: 'Trung Bình', hint: 'Cân bằng 3D' },
    { id: 'high', label: 'Cao', hint: 'AAA Bloom & 2K' },
  ];

  const hudScaleOptions: Array<{ id: HudScaleMode; label: string; hint: string }> = [
    { id: 'compact', label: 'Gọn', hint: '88%' },
    { id: 'normal', label: 'Chuẩn', hint: '100%' },
    { id: 'large', label: 'Lớn', hint: '112%' },
  ];

  const combatCameraOptions: Array<{ id: CombatCameraPreset; label: string; hint: string }> = [
    { id: 'action', label: 'Cận Cảnh', hint: 'Kịch tính' },
    { id: 'tactical', label: 'Chiến Thuật', hint: 'Cân bằng' },
    { id: 'wide', label: 'Toàn Cảnh', hint: 'Rộng sân' },
  ];

  const metrics = save ? normalizePlaytestMetrics(save.playtestMetrics) : null;

  const handleCopyJson = async () => {
    if (!metrics) return;
    const payload = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        highestChapterCleared: save?.highestChapterCleared ?? 0,
        bestStagePerChapter: save?.bestStagePerChapter ?? {},
        selectedHeroId: save?.selectedHeroId ?? 'aurelia',
        playtestMetrics: metrics,
      },
      null,
      2
    );
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
      }
      soundEngine.playUiClick(1.1);
      setCopiedJson(true);
      window.setTimeout(() => setCopiedJson(false), 2200);
    } catch {
      setCopiedJson(true);
      window.setTimeout(() => setCopiedJson(false), 2200);
    }
  };

  const handleCopySaveCode = async () => {
    if (!save) return;
    const code = encodeSaveTransferCode(save);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      }
    } catch {
      // Fallback handled silently
    }
    soundEngine.playUiClick(1.12);
    setCopiedSaveCode(true);
    window.setTimeout(() => setCopiedSaveCode(false), 2200);
  };

  const handleDownloadSaveJson = () => {
    if (!save) return;
    soundEngine.playUiClick(1.08);
    const blob = new Blob([encodeSignedSaveJson(save)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `aetherbow-save-ch${save.highestChapterCleared}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleValidateImport = (rawText: string) => {
    setImportSuccess(false);
    const res = decodeSaveTransferCode(rawText);
    if (!res.ok || !res.save || !res.preview) {
      setImportError(res.error ?? 'Mã sao lưu không hợp lệ.');
      setImportPending(null);
      return;
    }
    setImportError(null);
    setImportPending({ save: res.save, preview: res.preview });
  };

  if (showSaveTransfer && save) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#040611]/90">
        <div className="cel-panel-ornate w-full max-w-lg rounded-3xl p-5 sm:p-6 max-h-[90vh] flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-amber-400/25 pb-3 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick(0.95);
                  setShowSaveTransfer(false);
                  setImportError(null);
                  setImportPending(null);
                  setImportSuccess(false);
                }}
                aria-label="Quay Lại Cài Đặt"
                className="cel-panel w-8 h-8 rounded-xl flex items-center justify-center text-amber-200 hover:text-white cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <h2 className="font-display text-base sm:text-lg font-black text-amber-200 truncate">
                  Sao Lưu &amp; Khôi Phục Mã Save
                </h2>
                <p className="text-[11px] text-slate-400 font-semibold truncate">
                  Chuẩn ABW5 &amp; JSON-V2 · Kiểm tra checksum toàn vẹn
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onClose();
              }}
              aria-label="Đóng"
              className="cel-panel w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-white cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-0.5">
            {/* Export Block */}
            <div className="rounded-2xl bg-[#080d1e] border border-amber-400/25 p-3.5 space-y-2.5">
              <div className="text-xs font-black text-amber-200">1. Xuất Dữ Liệu Hiện Tại</div>
              <div className="text-[11px] text-slate-300 font-mono-nums">
                Chương đã vượt: {save.highestChapterCleared} · Vàng:{' '}
                {save.gold.toLocaleString('vi-VN')} · Ngọc: {save.gems.toLocaleString('vi-VN')} ·
                Trang bị: {save.inventory.length}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopySaveCode}
                  className="a2-yellow-btn py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  {copiedSaveCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>Đã Sao Chép Mã ABW5</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 shrink-0" />
                      <span>Sao Chép Mã Save</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSaveJson}
                  className="a2-slate-btn py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                  <span>Tải Tệp .JSON</span>
                </button>
              </div>
            </div>

            {/* Import Block */}
            <div className="rounded-2xl bg-[#080d1e] border border-sky-400/25 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-sky-200">2. Nhập Mã Save Hoặc Tệp .JSON</span>
                <label className="text-[11px] font-bold text-amber-300 hover:text-amber-200 cursor-pointer flex items-center gap-1 whitespace-nowrap">
                  <Upload className="w-3.5 h-3.5 shrink-0" />
                  <span>Chọn Tệp</span>
                  <input
                    type="file"
                    accept=".json,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        const text = typeof reader.result === 'string' ? reader.result : '';
                        setImportText(text);
                        handleValidateImport(text);
                      };
                      reader.readAsText(file);
                    }}
                  />
                </label>
              </div>

              <textarea
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value);
                  setImportError(null);
                  setImportPending(null);
                  setImportSuccess(false);
                }}
                placeholder="Dán mã ABW5:... hoặc nội dung JSON sao lưu vào đây..."
                rows={4}
                className="w-full rounded-xl bg-[#040712] border border-slate-700 focus:border-amber-300 outline-none p-2.5 text-[11px] font-mono text-slate-200 resize-none"
              />

              <button
                type="button"
                onClick={() => handleValidateImport(importText)}
                disabled={!importText.trim()}
                className={`w-full py-2 rounded-xl text-xs font-black whitespace-nowrap ${
                  importText.trim()
                    ? 'a2-slate-btn cursor-pointer'
                    : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                Kiểm Tra Mã Save
              </button>

              {importError && (
                <div className="rounded-xl bg-rose-500/15 border border-rose-400/45 px-3 py-2 text-[11px] font-semibold text-rose-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
                  <span>{importError}</span>
                </div>
              )}

              {importPending && (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/45 p-3 space-y-2">
                  <div className="text-xs font-black text-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span>Mã Save Hợp Lệ ({importPending.preview.version})</span>
                  </div>
                  <div className="text-[11px] text-slate-200 font-mono-nums leading-relaxed">
                    Chương cao nhất: {importPending.preview.highestChapterCleared} · Anh Hùng:{' '}
                    {HERO_MAP[importPending.preview.selectedHeroId]?.name ??
                      importPending.preview.selectedHeroId}{' '}
                    · Vàng: {importPending.preview.gold.toLocaleString('vi-VN')} · Ngọc:{' '}
                    {importPending.preview.gems.toLocaleString('vi-VN')} · Trang bị:{' '}
                    {importPending.preview.gearCount} · Tháp Vô Tận: Tầng{' '}
                    {importPending.preview.bestTowerFloor}
                  </div>
                  {onImportSave && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playLevelUp();
                        onImportSave(importPending.save);
                        setImportPending(null);
                        setImportText('');
                        setImportSuccess(true);
                      }}
                      className="a2-emerald-btn w-full py-2 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap"
                    >
                      Xác Nhận Khôi Phục &amp; Ghi Đè Save Hiện Tại
                    </button>
                  )}
                </div>
              )}

              {importSuccess && (
                <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/50 px-3 py-2 text-xs font-bold text-emerald-200">
                  Khôi phục dữ liệu thành công! Tiến trình đã được cập nhật ngay lập tức.
                </div>
              )}
            </div>

            {/* Wave 17: Automatic Local Save Snapshot & Rollback Vault (Max 5 Mốc) */}
            <div
              data-testid="settings-rollback-vault"
              className="rounded-2xl bg-[#080d1e] border border-emerald-400/30 p-3.5 space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-black text-emerald-200">
                    3. Kho Sao Lưu &amp; Khôi Phục Nhanh ({rollbackSnapshots.length}/{SAVE_ROLLBACK_MAX_SNAPSHOTS} Mốc)
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Hệ thống tự động lưu mốc có mã kiểm tra FNV-1a trước khi nhập Save hoặc đặt lại dữ liệu.
                  </p>
                </div>
                {save && (
                  <button
                    type="button"
                    data-testid="settings-create-rollback-snapshot"
                    onClick={() => {
                      soundEngine.playUiClick(1.08);
                      recordLocalRollbackSnapshot(save, 'manual');
                      setRollbackTick((t) => t + 1);
                      setConfirmRollbackId(null);
                      setRollbackNotice({
                        ok: true,
                        text: 'Đã tạo mốc sao lưu thủ công có mã kiểm tra FNV-1a.',
                      });
                    }}
                    className="a2-emerald-btn px-3 py-1.5 rounded-lg text-[11px] font-black whitespace-nowrap cursor-pointer"
                  >
                    Tạo Mốc Ngay
                  </button>
                )}
              </div>

              {rollbackSnapshots.length === 0 ? (
                <div className="rounded-xl bg-[#040712] border border-slate-800 px-3 py-2.5 text-[11px] text-slate-400">
                  Chưa có mốc sao lưu cục bộ. Bấm &ldquo;Tạo Mốc Ngay&rdquo; để lưu trạng thái hiện tại.
                </div>
              ) : (
                <div className="space-y-2">
                  {rollbackSnapshots.map((snap) => {
                    const isConfirming = confirmRollbackId === snap.id;
                    const dateLabel = new Date(snap.createdAtMs).toLocaleString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                    });
                    return (
                      <div
                        key={snap.id}
                        className="rounded-xl bg-[#050916] border border-slate-800 p-2.5 space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs font-black text-white">
                              {snap.reasonLabel} · <span className="text-slate-400 font-mono-nums tabular-nums">{dateLabel}</span>
                            </div>
                            <div className="text-[11px] text-slate-300 font-mono-nums tabular-nums">
                              Ch.{snap.highestChapterCleared} · {snap.powerRating.toLocaleString('vi-VN')} LC ·{' '}
                              {snap.gold.toLocaleString('vi-VN')} Vàng · {snap.gems.toLocaleString('vi-VN')} Ngọc ·{' '}
                              <span className="text-emerald-300">#{snap.checksum}</span>
                            </div>
                          </div>
                          {onImportSave && !isConfirming && (
                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playUiClick(1.02);
                                setConfirmRollbackId(snap.id);
                                setRollbackNotice(null);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-[#142038] border border-sky-400/45 hover:border-sky-300 text-sky-200 text-[11px] font-black whitespace-nowrap cursor-pointer"
                            >
                              Khôi Phục
                            </button>
                          )}
                        </div>
                        {isConfirming && onImportSave && (
                          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-800">
                            <span className="text-[11px] font-bold text-amber-200">
                              Lưu hiện tại sẽ được tự động sao lưu trước khi khôi phục. Xác nhận?
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setConfirmRollbackId(null)}
                                className="a2-slate-btn px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer"
                              >
                                Hủy
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const vault = loadLocalRollbackVault();
                                  const restored = restoreSaveRollbackSnapshot(vault, snap.id);
                                  if (!restored.ok || !restored.save) {
                                    setRollbackNotice({
                                      ok: false,
                                      text: restored.error ?? 'Không thể khôi phục mốc sao lưu này.',
                                    });
                                    setConfirmRollbackId(null);
                                    return;
                                  }
                                  if (save) {
                                    recordLocalRollbackSnapshot(save, 'pre_restore');
                                  }
                                  soundEngine.playLevelUp();
                                  onImportSave(restored.save);
                                  setConfirmRollbackId(null);
                                  setRollbackTick((t) => t + 1);
                                  setRollbackNotice({
                                    ok: true,
                                    text: `Đã khôi phục mốc ${snap.reasonLabel} (#${snap.checksum}) thành công!`,
                                  });
                                }}
                                className="a2-emerald-btn px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer"
                              >
                                Xác Nhận
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {rollbackNotice && (
                <div
                  className={`rounded-xl px-3 py-2 text-xs font-bold border ${
                    rollbackNotice.ok
                      ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                      : 'bg-rose-500/15 border-rose-400/50 text-rose-200'
                  }`}
                >
                  {rollbackNotice.text}
                </div>
              )}
            </div>

            {onResetPlayerData && (
              <div className="rounded-2xl bg-[#080d1e] border border-rose-500/35 p-3.5 space-y-2.5">
                <div className="text-xs font-black text-rose-300 flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>4. Đặt Lại Dữ Liệu Về Ban Đầu</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Xóa toàn bộ tiến trình chương, vàng, ngọc, trang bị, bảng xếp hạng cá nhân và đưa tài khoản hiện tại về trạng thái khởi đầu mới.
                </p>
                {!confirmResetOpen ? (
                  <button
                    type="button"
                    disabled={resettingData}
                    onClick={() => {
                      soundEngine.playUiClick(0.9);
                      setResetDone(false);
                      setConfirmResetOpen(true);
                    }}
                    className="w-full py-2 px-3 rounded-xl text-xs font-black border border-rose-500/45 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 cursor-pointer whitespace-nowrap transition-colors"
                  >
                    Đặt Lại Toàn Bộ Dữ Liệu
                  </button>
                ) : (
                  <div className="rounded-xl bg-rose-950/50 border border-rose-400/50 p-3 space-y-2">
                    <div className="text-[11px] font-bold text-rose-200 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
                      <span>Bạn chắc chắn muốn đưa toàn bộ dữ liệu người chơi về trạng thái ban đầu?</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={resettingData}
                        onClick={() => {
                          soundEngine.playUiClick(0.95);
                          setConfirmResetOpen(false);
                        }}
                        className="a2-slate-btn py-2 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        disabled={resettingData}
                        onClick={async () => {
                          soundEngine.playUiClick(0.85);
                          setResettingData(true);
                          try {
                            await onResetPlayerData();
                            setConfirmResetOpen(false);
                            setResetDone(true);
                          } finally {
                            setResettingData(false);
                          }
                        }}
                        className="py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white cursor-pointer whitespace-nowrap disabled:opacity-60"
                      >
                        {resettingData ? 'Đang đặt lại…' : 'Xác Nhận Đặt Lại'}
                      </button>
                    </div>
                  </div>
                )}
                {resetDone && (
                  <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/50 px-3 py-2 text-xs font-bold text-emerald-200">
                    Đã đưa toàn bộ dữ liệu về trạng thái ban đầu!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (showPlaytestKpi && metrics) {
    const hasFirstDefeat = typeof metrics.firstDefeatRunIndex === 'number';
    const run2RateLabel = !hasFirstDefeat
      ? 'Chưa ghi nhận thất bại đầu'
      : metrics.startedRunAfterFirstDefeat
      ? '100% (Đã vào Lượt 2)'
      : '0% (Chưa bắt đầu Lượt 2)';

    const milestoneRows = [
      { label: 'Cường hóa đầu tiên', rec: metrics.milestones.firstUpgrade },
      { label: 'Trang bị Hiếm đầu tiên', rec: metrics.milestones.firstRare },
      { label: 'Trang bị Sử Thi đầu tiên', rec: metrics.milestones.firstEpic },
      { label: 'Trang bị Mẫu [S] đầu tiên', rec: metrics.milestones.firstSTier },
      { label: 'Vượt Chương 1', rec: metrics.milestones.firstCh1Clear },
    ];
    const activeSets = save ? evaluateEquippedGearSets(save) : null;
    const masteryMap = save ? normalizeHeroMastery(save.heroMastery) : {};
    const maxMasteryLevel = Math.max(
      1,
      ...Object.values(masteryMap).map((m) => m?.level ?? 1)
    );
    const kpiRows = evaluatePlaytestKpis(metrics, {
      highestChapterCleared: save?.highestChapterCleared ?? 0,
      activeSetCount: activeSets ? activeSets.sets.filter((s) => s.unlockedTiers.length > 0).length : 0,
      maxMasteryLevel,
    });
    const kpiPassCount = kpiRows.filter((r) => r.status === 'pass').length;
    const kpiWarnCount = kpiRows.filter((r) => r.status === 'warn').length;
    const runHistory = (save?.runHistory ?? []).slice(0, 20);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#040611]/90">
        <div className="cel-panel-ornate w-full max-w-xl rounded-3xl p-5 sm:p-6 max-h-[90vh] flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-amber-400/25 pb-3 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick(0.95);
                  setShowPlaytestKpi(false);
                  setConfirmReset(false);
                }}
                aria-label="Quay Lại Cài Đặt"
                className="cel-panel w-8 h-8 rounded-xl flex items-center justify-center text-amber-200 hover:text-white cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <h2 className="font-display text-base sm:text-lg font-black text-white truncate">
                  Dữ Liệu Playtest &amp; KPI (Nội Bộ)
                </h2>
                <p className="text-[11px] text-slate-400">
                  Lưu cục bộ trên trình duyệt · Không gửi ra ngoài
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick(0.9);
                onClose();
              }}
              aria-label="Đóng"
              className="cel-panel w-8 h-8 rounded-xl flex items-center justify-center text-slate-200 hover:text-white cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Segmented Tab Switcher: 8-Criteria KPI vs Post-Run Battle Log */}
          <div className="grid grid-cols-2 gap-1.5 bg-[#060916] border border-amber-400/20 rounded-xl p-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick(1.02);
                setKpiTab('kpi');
              }}
              className={`py-1.5 px-2.5 rounded-lg text-xs font-black whitespace-nowrap cursor-pointer ${
                kpiTab === 'kpi'
                  ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Đánh Giá KPI ({kpiRows.length} Tiêu Chí)
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick(1.02);
                setKpiTab('history');
              }}
              className={`py-1.5 px-2.5 rounded-lg text-xs font-black whitespace-nowrap cursor-pointer ${
                kpiTab === 'history'
                  ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Nhật Ký Trận Đấu ({runHistory.length})
            </button>
          </div>

          <div className="overflow-y-auto a2-scroll space-y-4 pr-1 flex-1">
            {kpiTab === 'history' ? (
              runHistory.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-[#070b19] px-4 py-8 text-center text-xs text-slate-400">
                  Chưa có trận đấu nào được ghi nhận. Hoàn thành 1 trận để xem Nhật Ký chi tiết.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl bg-[#070b19]">
                  {runHistory.map((entry) => {
                    const heroName = HERO_MAP[entry.heroId]?.name ?? entry.heroId;
                    const synNames = (entry.activeSynergies ?? [])
                      .map((id) => SKILL_SYNERGY_MAP[id]?.name ?? id);
                    return (
                      <div key={entry.id} className="px-3 py-2.5 space-y-1 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white truncate">{entry.label}</span>
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-black shrink-0 whitespace-nowrap ${
                              entry.victory ? 'text-emerald-300' : 'text-rose-300'
                            }`}
                          >
                            {entry.victory ? (
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <span>{entry.victory ? 'Chiến Thắng' : 'Thất Bại'}</span>
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 font-mono-nums">
                          {heroName} · Ải/Tầng {entry.stageReached} · {entry.kills} Hạ Gục · Combo {entry.maxCombo}
                          {entry.durationSec ? ` · ${formatDurationSec(entry.durationSec)}` : ''}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono-nums">
                          +{entry.gold} Vàng · +{entry.gems} Ngọc
                          {entry.masteryExpGained ? ` · +${entry.masteryExpGained} EXP Tinh Thông` : ''}
                        </div>
                        {((entry.activeSetNames && entry.activeSetNames.length > 0) || synNames.length > 0) && (
                          <div className="text-[10px] text-amber-200/90">
                            {entry.activeSetNames && entry.activeSetNames.length > 0
                              ? `Bộ Đồ: ${entry.activeSetNames.join(', ')}`
                              : ''}
                            {entry.activeSetNames && entry.activeSetNames.length > 0 && synNames.length > 0
                              ? ' · '
                              : ''}
                            {synNames.length > 0 ? `Cộng Hưởng: ${synNames.join(', ')}` : ''}
                          </div>
                        )}
                        {!entry.victory && entry.defeatCauseLabel && (
                          <div className="text-[10px] text-rose-300">
                            Nguyên nhân: {entry.defeatCauseLabel}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <>
            {/* Key Summary Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="bg-[#080d1e] border border-amber-400/20 rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Tổng Lượt Chơi
                </div>
                <div className="font-mono-nums text-lg font-black text-white mt-0.5">
                  {metrics.totalRuns}
                </div>
              </div>
              <div className="bg-[#080d1e] border border-amber-400/20 rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Thời Gian Tích Lũy
                </div>
                <div className="font-mono-nums text-lg font-black text-amber-200 mt-0.5">
                  {formatDurationSec(metrics.totalPlaySeconds)}
                </div>
              </div>
              <div className="bg-[#080d1e] border border-amber-400/20 rounded-xl p-3 col-span-2 sm:col-span-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Giữ Nhịp Lượt 2
                </div>
                <div className="text-xs font-black text-emerald-300 mt-1 leading-snug">
                  {run2RateLabel}
                </div>
              </div>
            </div>

            {/* Phase 3: Auto-Graded KPI Threshold Evaluation */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                  Đánh Giá Ngưỡng KPI Tự Động ({kpiRows.length} Tiêu Chí)
                </span>
                <span className="font-mono-nums text-[11px] font-bold text-slate-300">
                  <span className="text-emerald-300">{kpiPassCount} Đạt</span>
                  {' · '}
                  <span className={kpiWarnCount > 0 ? 'text-amber-300' : 'text-slate-400'}>
                    {kpiWarnCount} Cần chỉnh
                  </span>
                </span>
              </div>
              <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl bg-[#070b19]">
                {kpiRows.map((row) => {
                  const statusTone =
                    row.status === 'pass'
                      ? 'text-emerald-300'
                      : row.status === 'warn'
                      ? 'text-amber-300'
                      : 'text-slate-400';
                  const statusLabel =
                    row.status === 'pass'
                      ? 'Đạt chuẩn'
                      : row.status === 'warn'
                      ? 'Cần điều chỉnh'
                      : 'Chưa đủ mẫu';
                  return (
                    <div key={row.id} className="px-3 py-2 flex items-start justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <div className="text-slate-100 font-semibold">{row.label}</div>
                        <div className="text-[11px] text-slate-400 font-mono-nums mt-0.5">
                          Thực tế: <span className="text-slate-200 font-bold">{row.actualText}</span>
                          {' · '}
                          Mục tiêu: {row.targetText}
                        </div>
                        {row.note && (
                          <div className="text-[10px] text-slate-400 mt-0.5">{row.note}</div>
                        )}
                      </div>
                      <span className={`inline-flex items-center gap-1 font-bold text-[11px] shrink-0 whitespace-nowrap ${statusTone}`}>
                        {row.status === 'pass' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        ) : row.status === 'warn' ? (
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{statusLabel}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Boss Attempts-to-First-Clear */}
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-300 mb-2">
                Số Lượt Đánh Boss Đến Khi Hạ Lần Đầu (Chương 1–12)
              </div>
              <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl bg-[#070b19]">
                {BOSS_LABELS.map((b) => {
                  const rec = metrics.bossAttempts[b.key];
                  return (
                    <div
                      key={b.key}
                      className="px-3 py-2 flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="text-slate-200 font-semibold truncate">{b.label}</span>
                      <span className="font-mono-nums text-slate-300 shrink-0">
                        {rec
                          ? `${rec.attempts} lần gặp · Hạ lần đầu: ${
                              rec.attemptsToFirstClear ? `Lượt #${rec.attemptsToFirstClear}` : 'Chưa'
                            }`
                          : 'Chưa chạm trán'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stage Entry & Defeat Funnel Ch.1-3 */}
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-300 mb-2">
                Phễu Vào Ải / Gục Ngã (Chương 1–3 · Mốc 1/2/4/8/12)
              </div>
              <div className="space-y-2">
                {(['1', '2', '3'] as const).map((chKey) => {
                  const entriesMap = metrics.stageEntriesByChapter[chKey] ?? {};
                  const defeatsMap = metrics.stageDefeatsByChapter[chKey] ?? {};
                  return (
                    <div key={chKey} className="grid grid-cols-6 gap-1.5 items-center">
                      <div className="text-[11px] font-black text-amber-200">Ch.{chKey}</div>
                      {FUNNEL_STAGES.map((st) => {
                        const en = entriesMap[st] ?? 0;
                        const df = defeatsMap[st] ?? 0;
                        return (
                          <div
                            key={`${chKey}_${st}`}
                            className="bg-[#070b19] border border-slate-800 rounded-lg py-1.5 px-1 text-center"
                          >
                            <div className="text-[9px] font-bold text-slate-400">Ải {st}</div>
                            <div className="font-mono-nums text-[11px] font-black text-white">
                              {en}
                              <span
                                className={
                                  df > 0 ? 'text-rose-300 ml-0.5' : 'text-slate-500 ml-0.5'
                                }
                              >
                                /-{df}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Milestones Timing */}
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-300 mb-2">
                Mốc Thời Gian &amp; Số Lượt Đạt Tiến Trình
              </div>
              <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl bg-[#070b19]">
                {milestoneRows.map((row) => (
                  <div
                    key={row.label}
                    className="px-3 py-2 flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="text-slate-200 font-semibold">{row.label}</span>
                    <span
                      className={`font-mono-nums shrink-0 ${
                        row.rec ? 'text-emerald-300 font-bold' : 'text-slate-500'
                      }`}
                    >
                      {row.rec
                        ? `Lượt #${row.rec.runIndex} · ${formatDurationSec(row.rec.elapsedSec)}`
                        : 'Chưa đạt'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Synergy Activation Counts */}
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-300 mb-2">
                Tần Suất Kích Hoạt {SKILL_SYNERGIES.length} Cộng Hưởng Kỹ Năng
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SKILL_SYNERGIES.map((syn) => {
                  const count = metrics.synergyPickCounts[syn.id] ?? 0;
                  return (
                    <div
                      key={syn.id}
                      className="bg-[#070b19] border border-slate-800 rounded-lg px-3 py-2 flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="text-slate-200 font-semibold truncate">{syn.name}</span>
                      <span className="font-mono-nums font-black text-amber-200 shrink-0">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
              </>
            )}
          </div>

          <div className="pt-2 border-t border-amber-400/20 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyJson}
              className="a2-slate-btn px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              {copiedJson ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span className="text-emerald-300">Đã Sao Chép JSON</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>Sao Chép JSON</span>
                </>
              )}
            </button>

            {onResetPlaytestMetrics && (
              <button
                type="button"
                onClick={() => {
                  if (!confirmReset) {
                    soundEngine.playUiClick(0.95);
                    setConfirmReset(true);
                    return;
                  }
                  soundEngine.playUiClick(0.8);
                  onResetPlaytestMetrics();
                  setConfirmReset(false);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer border ${
                  confirmReset
                    ? 'bg-rose-600/90 border-rose-300 text-white'
                    : 'bg-rose-500/10 border-rose-400/40 text-rose-200 hover:bg-rose-500/20'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>{confirmReset ? 'Xác Nhận Xóa KPI?' : 'Đặt Lại KPI'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#040611]/90">
      <div className="cel-panel-ornate w-full max-w-md rounded-3xl p-5 sm:p-6 space-y-5 max-h-[90vh] overflow-y-auto a2-scroll">
        <div className="flex items-center justify-between border-b border-amber-400/25 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-300" />
            <h2 className="font-display text-lg font-black text-white">
              Cài Đặt Hệ Thống
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(0.9);
              onClose();
            }}
            aria-label="Đóng Cài Đặt"
            className="cel-panel w-8 h-8 rounded-xl flex items-center justify-center text-slate-200 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Audio Sliders */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4" />
              <span>Âm Thanh &amp; Nhạc Nền</span>
            </span>
            <button
              type="button"
              onClick={onToggleMute}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                muted
                  ? 'bg-rose-500/20 border border-rose-400/50 text-rose-200'
                  : 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-200'
              }`}
            >
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{muted ? 'Đang Tắt Tiếng' : 'Đang Bật Tiếng'}</span>
            </button>
          </div>

          {[
            { key: 'masterVol' as const, label: 'Âm lượng tổng', val: settings.masterVol },
            { key: 'bgmVol' as const, label: 'Nhạc nền (BGM)', val: settings.bgmVol },
            { key: 'sfxVol' as const, label: 'Hiệu ứng chiến đấu (SFX)', val: settings.sfxVol },
          ].map((item) => (
            <div key={item.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-200 font-semibold">{item.label}</span>
                <span className="font-mono-nums font-bold text-amber-200">
                  {Math.round(item.val * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(item.val * 100)}
                onChange={(e) =>
                  onUpdateSettings({ [item.key]: Number(e.target.value) / 100 })
                }
                className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-900 rounded-lg"
              />
            </div>
          ))}
        </div>

        <div className="cel-divider-gold" />

        {/* 3D Graphics Quality */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Monitor className="w-4 h-4 shrink-0" />
              <span>Chất Lượng Đồ Họa 3D</span>
            </div>
            {gpuProfile && settings.graphicsQuality !== gpuProfile.recommendedQuality && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick(1.06);
                  onUpdateSettings({
                    graphicsQuality: gpuProfile.recommendedQuality,
                    bloomEnabled: gpuProfile.bloomSupported,
                  });
                }}
                className="text-[11px] font-bold text-sky-300 hover:text-sky-200 underline underline-offset-2 cursor-pointer whitespace-nowrap shrink-0"
              >
                Dùng mức đề xuất
              </button>
            )}
          </div>

          {gpuProfile && (() => {
            const activeBudget = resolveSystemLiteBudget(
              gpuProfile,
              settings.lowEndSafetyMode ?? 'auto',
              settings.chapter1MapMode ?? 'auto'
            );
            const deviceTierBadge =
              activeBudget.deviceTier === 'ultra_lite'
                ? 'Siêu Nhẹ'
                : activeBudget.deviceTier === 'lite'
                ? 'Cấu Hình Yếu · Lite'
                : activeBudget.deviceTier === 'balanced'
                ? 'Trung Bình'
                : 'Hiệu Năng Cao';
            const vramLabel = gpuProfile.estimatedVramMb
              ? gpuProfile.estimatedVramMb >= 1024
                ? `${(gpuProfile.estimatedVramMb / 1024).toFixed(1)} GB`
                : `${gpuProfile.estimatedVramMb} MB`
              : 'Không rõ';
            const ramLabel = gpuProfile.deviceMemoryGb
              ? `${gpuProfile.deviceMemoryGb} GB`
              : 'Trình duyệt ẩn';
            const cpuLabel = gpuProfile.logicalCores
              ? `${gpuProfile.logicalCores} luồng`
              : 'Không rõ';

            return (
              <div className="rounded-xl bg-[#070b18] border border-slate-800 px-3 py-2.5 space-y-2 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold text-slate-100 flex items-center gap-1.5 truncate">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span className="truncate">{gpuProfile.tierLabel}</span>
                  </div>
                  <span
                    className={`font-mono-nums text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 whitespace-nowrap ${
                      activeBudget.liteActive
                        ? 'bg-emerald-950/60 border-emerald-400/35 text-emerald-200'
                        : 'bg-sky-950/60 border-sky-400/35 text-sky-200'
                    }`}
                  >
                    {activeBudget.liteActive ? 'CHẾ ĐỘ LITE' : deviceTierBadge}
                  </span>
                </div>

                {/* Hardware Diagnostics Matrix: CPU · GPU · RAM · VRAM */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                  <div className="rounded-lg bg-[#0b1124] border border-slate-800/90 px-2 py-1.5">
                    <div className="text-slate-400 flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-sky-300 shrink-0" />
                      <span>CPU</span>
                    </div>
                    <div className="font-mono-nums font-bold text-slate-100 mt-0.5 truncate">
                      {cpuLabel}
                    </div>
                  </div>
                  <div className="rounded-lg bg-[#0b1124] border border-slate-800/90 px-2 py-1.5">
                    <div className="text-slate-400 flex items-center gap-1">
                      <HardDrive className="w-3 h-3 text-amber-300 shrink-0" />
                      <span>RAM</span>
                    </div>
                    <div className="font-mono-nums font-bold text-slate-100 mt-0.5 truncate">
                      {ramLabel}
                    </div>
                  </div>
                  <div className="rounded-lg bg-[#0b1124] border border-slate-800/90 px-2 py-1.5">
                    <div className="text-slate-400 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-violet-300 shrink-0" />
                      <span>VRAM ước tính</span>
                    </div>
                    <div className="font-mono-nums font-bold text-slate-100 mt-0.5 truncate">
                      {vramLabel}
                    </div>
                  </div>
                  <div className="rounded-lg bg-[#0b1124] border border-slate-800/90 px-2 py-1.5">
                    <div className="text-slate-400 flex items-center gap-1">
                      <Monitor className="w-3 h-3 text-emerald-300 shrink-0" />
                      <span>Mục tiêu</span>
                    </div>
                    <div className="font-mono-nums font-bold text-slate-100 mt-0.5 text-[9.5px] whitespace-nowrap">
                      {activeBudget.targetCombatFps}fps · {activeBudget.maxTextureSize}px
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 truncate">
                  GPU: <span className="text-slate-200 font-semibold">{gpuProfile.rendererName}</span>
                </div>

                <div className="text-[10px] text-slate-400 leading-relaxed">
                  Áp dụng toàn game (Chương 1–12 &amp; mọi chế độ):{' '}
                  <span className="text-slate-200 font-semibold">
                    {activeBudget.deviceTier === 'ultra_lite'
                      ? 'Chế độ Siêu Nhẹ · Texture 512px · Sân đấu tối giản chống treo WebGL'
                      : activeBudget.liteActive
                      ? 'Sảnh 100% độ phân giải gốc · Mô hình Lite 1024px · Khử răng cưa mượt · Tắt Bloom/Đổ bóng nặng khi vào trận'
                      : 'Mô hình High PBR · Khử răng cưa MSAA + Tăng nét CAS · Đổ bóng & Bloom sắc nét theo cấu hình'}
                  </span>
                </div>

                {gpuProfile.safetyReason && (
                  <div className="text-[10px] text-amber-200/90 leading-relaxed">
                    {gpuProfile.safetyReason}
                  </div>
                )}

                {gpuProfile.crashGuardTripped && onResetGpuCrashGuard && (
                  <div className="pt-1.5 flex items-center justify-between gap-2 border-t border-slate-800/80">
                    <span className="text-[10px] text-rose-300 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Chốt chống sập WebGL đang khóa tài nguyên nặng toàn hệ thống</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick(1.05);
                        onResetGpuCrashGuard();
                      }}
                      className="text-[10px] font-bold text-sky-300 hover:text-sky-200 underline underline-offset-2 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Đặt lại chốt
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Global System-Wide Lite Mode Toggle (All 12 Chapters & All Modes) */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="font-bold text-slate-200">Chế Độ Lite Toàn Hệ Thống</span>
              <span className="text-[10px] text-slate-400 font-mono-nums">
                {gpuProfile &&
                isLowEndSafetyModeActive(gpuProfile, settings.lowEndSafetyMode ?? 'auto')
                  ? 'Đang bật Lite · Bảo vệ GPU mọi chương'
                  : 'Chế độ Tiêu Chuẩn · 60 FPS · Sắc Nét'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'auto', label: 'Tự Động', hint: 'Khuyên dùng' },
                  { id: 'on', label: 'Luôn Bật Lite', hint: 'Mọi chương · 30 FPS' },
                  { id: 'off', label: 'Tiêu Chuẩn', hint: 'Đầy đủ 60 FPS' },
                ] as Array<{ id: LowEndSafetyMode; label: string; hint: string }>
              ).map((opt) => {
                const active = (settings.lowEndSafetyMode ?? 'auto') === opt.id;
                const lockedSoftware = opt.id === 'off' && gpuProfile?.tier === 'software';
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={lockedSoftware}
                    onClick={() => {
                      soundEngine.playUiClick(1.05);
                      if (
                        opt.id === 'off' &&
                        gpuProfile &&
                        (gpuProfile.lowPowerLegacyGpu ||
                          gpuProfile.deviceTier === 'lite' ||
                          gpuProfile.deviceTier === 'ultra_lite' ||
                          gpuProfile.crashGuardTripped)
                      ) {
                        setConfirmDisableLiteOnLowEnd(true);
                        return;
                      }
                      setConfirmDisableLiteOnLowEnd(false);
                      onUpdateSettings({ lowEndSafetyMode: opt.id });
                    }}
                    className={`py-2 px-2 rounded-xl text-center border transition-colors whitespace-nowrap ${
                      lockedSoftware
                        ? 'bg-[#080d1e] border-slate-800 text-slate-500 cursor-not-allowed'
                        : active
                        ? 'a2-yellow-btn cursor-pointer'
                        : 'bg-[#080d1e] border-amber-400/25 text-slate-200 hover:border-amber-300 cursor-pointer'
                    }`}
                  >
                    <div className="text-xs font-black truncate">{opt.label}</div>
                    <div
                      className={`text-[10px] mt-0.5 truncate ${
                        active ? 'text-slate-900 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {opt.hint}
                    </div>
                  </button>
                );
              })}
            </div>
            {confirmDisableLiteOnLowEnd && (
              <div className="rounded-xl bg-rose-950/50 border border-rose-400/40 p-2.5 space-y-2 text-[11px]">
                <div className="text-rose-100 font-semibold leading-relaxed">
                  Thiết bị hiện tại có GPU tích hợp yếu hoặc bộ nhớ hạn chế (như Intel HD 4000 / Dell Latitude E5430). Tắt Chế Độ Lite sẽ mở khóa độ nét cao (và tự gỡ Chốt chống sập nếu đang bật), nhưng có thể gây giật lag nặng nếu GPU quá tải. Bạn vẫn muốn chuyển sang Tiêu Chuẩn?
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick(0.95);
                      setConfirmDisableLiteOnLowEnd(false);
                      onUpdateSettings({ lowEndSafetyMode: 'auto' });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold cursor-pointer whitespace-nowrap"
                  >
                    Giữ Chế Độ Lite
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick(1.08);
                      setConfirmDisableLiteOnLowEnd(false);
                      if (gpuProfile?.crashGuardTripped && onResetGpuCrashGuard) {
                        onResetGpuCrashGuard();
                      }
                      onUpdateSettings({ lowEndSafetyMode: 'off' });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                  >
                    Vẫn Tắt Lite
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Unified Chapter 1–2 3D Map Mode */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="font-bold text-slate-200">Bản Đồ 3D Chương 1–2</span>
              <span className="text-[10px] text-slate-400 font-mono-nums">
                {(() => {
                  if (!gpuProfile) return 'Bản Đồ 3D Chương 1–2';
                  const activeVariant = resolveChapter1MapVariant(
                    gpuProfile,
                    settings.chapter1MapMode ?? 'auto',
                    settings.lowEndSafetyMode ?? 'auto'
                  );
                  if (activeVariant === 'full') return 'Đang dùng Bản Gốc 4K (Ch.1–2)';
                  if (activeVariant === 'lite') return 'Đang dùng 3D Lite (~1,3 MB · Ch.1–2)';
                  return 'Đang dùng Sân Đấu Nhẹ';
                })()}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'auto', label: 'Tự động', hint: 'Máy yếu tự dùng Lite' },
                  { id: 'lite_3d', label: '3D Lite', hint: '~1,3 MB cục bộ · 30k mặt' },
                  { id: 'light', label: 'Sân Nhẹ', hint: 'Nhẹ nhất · 0 MB' },
                  { id: 'high_3d', label: 'Bản Gốc 4K', hint: 'Ch.1 90MB · Ch.2 76MB CDN' },
                ] as Array<{ id: Chapter1MapMode; label: string; hint: string }>
              ).map((opt) => {
                const active = (settings.chapter1MapMode ?? 'auto') === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick(1.05);
                      if (
                        opt.id === 'high_3d' &&
                        gpuProfile &&
                        (!gpuProfile.supportsHighDetailChapter1Map || gpuProfile.crashGuardTripped)
                      ) {
                        setConfirmHeavyMapOverride(true);
                        return;
                      }
                      setConfirmHeavyMapOverride(false);
                      onUpdateSettings({ chapter1MapMode: opt.id });
                    }}
                    className={`py-2 px-2.5 rounded-xl text-center border cursor-pointer transition-colors whitespace-nowrap ${
                      active
                        ? 'a2-yellow-btn'
                        : 'bg-[#080d1e] border-amber-400/25 text-slate-200 hover:border-amber-300'
                    }`}
                  >
                    <div className="text-xs font-black truncate">{opt.label}</div>
                    <div
                      className={`text-[10px] mt-0.5 truncate ${
                        active ? 'text-slate-900 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {opt.hint}
                    </div>
                  </button>
                );
              })}
            </div>
            {confirmHeavyMapOverride && (
              <div className="rounded-xl bg-rose-950/50 border border-rose-400/40 p-2.5 space-y-2 text-[11px]">
                <div className="text-rose-100 font-semibold leading-relaxed">
                  Máy hiện tại thuộc nhóm GPU tích hợp yếu/cũ. Nạp Bản Gốc 4K (Ch.1 90,3 MB · Ch.2 76,3 MB CDN · ~1,5 triệu mặt) có thể gây đơ, đen màn hình hoặc tắt nguồn do quá nhiệt. Khuyên dùng bản 3D Lite (~1,3 MB cục bộ) — bạn vẫn muốn bật Bản Gốc?
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick(0.95);
                      setConfirmHeavyMapOverride(false);
                      onUpdateSettings({ chapter1MapMode: 'lite_3d' });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold cursor-pointer whitespace-nowrap"
                  >
                    Dùng 3D Lite
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick(1.08);
                      setConfirmHeavyMapOverride(false);
                      onUpdateSettings({ chapter1MapMode: 'high_3d' });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                  >
                    Vẫn Bật Bản Gốc
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {qualityOptions.map((opt) => {
              const active = settings.graphicsQuality === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick(1.05);
                    onUpdateSettings({ graphicsQuality: opt.id });
                  }}
                  className={`py-2 px-2 rounded-xl text-center border cursor-pointer transition-colors ${
                    active
                      ? 'a2-yellow-btn'
                      : 'bg-[#080d1e] border-amber-400/25 text-slate-200 hover:border-amber-300'
                  }`}
                >
                  <div className="text-xs font-black">{opt.label}</div>
                  <div
                    className={`text-[10px] mt-0.5 ${
                      active ? 'text-slate-900 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {opt.hint}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Combat & 3D Toggles */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onUpdateSettings({ screenShake: !settings.screenShake });
            }}
            className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
              settings.screenShake
                ? 'bg-emerald-500/15 border-emerald-400/55 text-emerald-100'
                : 'bg-[#080d1e] border-slate-700 text-slate-400'
            }`}
          >
            <div className="text-xs font-black">Rung Camera</div>
            <div className="text-[11px] mt-0.5 font-semibold">
              {settings.screenShake ? 'Đang bật' : 'Đã tắt'}
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onUpdateSettings({ showDamageNumbers: !settings.showDamageNumbers });
            }}
            className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
              settings.showDamageNumbers
                ? 'bg-emerald-500/15 border-emerald-400/55 text-emerald-100'
                : 'bg-[#080d1e] border-slate-700 text-slate-400'
            }`}
          >
            <div className="text-xs font-black">Số Sát Thương</div>
            <div className="text-[11px] mt-0.5 font-semibold">
              {settings.showDamageNumbers ? 'Đang hiện' : 'Đã ẩn'}
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onUpdateSettings({ starfallWeather: settings.starfallWeather === false });
            }}
            className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
              settings.starfallWeather !== false
                ? 'bg-emerald-500/15 border-emerald-400/55 text-emerald-100'
                : 'bg-[#080d1e] border-slate-700 text-slate-400'
            }`}
          >
            <div className="text-xs font-black">Thời Tiết 3D Động</div>
            <div className="text-[11px] mt-0.5 font-semibold">
              {settings.starfallWeather !== false ? 'Đang bật (4 khí hậu)' : 'Đã tắt'}
            </div>
          </button>

          <button
            type="button"
            disabled={gpuProfile ? !gpuProfile.bloomSupported : false}
            onClick={() => {
              soundEngine.playUiClick();
              onUpdateSettings({ bloomEnabled: settings.bloomEnabled === false });
            }}
            className={`p-3 rounded-xl border text-left transition-colors ${
              gpuProfile && !gpuProfile.bloomSupported
                ? 'bg-[#080d1e] border-slate-800 text-slate-500 cursor-not-allowed'
                : settings.bloomEnabled !== false && settings.graphicsQuality !== 'low'
                ? 'bg-emerald-500/15 border-emerald-400/55 text-emerald-100 cursor-pointer'
                : 'bg-[#080d1e] border-slate-700 text-slate-400 cursor-pointer'
            }`}
          >
            <div className="text-xs font-black">Hậu Kỳ Bloom 3D</div>
            <div className="text-[11px] mt-0.5 font-semibold">
              {gpuProfile && !gpuProfile.bloomSupported
                ? 'GPU tự tắt'
                : settings.graphicsQuality === 'low'
                ? 'Tắt ở mức Thấp'
                : settings.bloomEnabled !== false
                ? 'Đang bật'
                : 'Đã tắt'}
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onUpdateSettings({
                adaptiveResolutionGuard: settings.adaptiveResolutionGuard === false,
              });
            }}
            className={`col-span-2 p-3 rounded-xl border text-left cursor-pointer transition-colors ${
              settings.adaptiveResolutionGuard !== false
                ? 'bg-emerald-500/15 border-emerald-400/55 text-emerald-100'
                : 'bg-[#080d1e] border-slate-700 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black">Bảo Vệ Độ Phân Giải Thích Ứng (AAA 60 FPS)</span>
              <span className="text-[11px] font-bold shrink-0">
                {settings.adaptiveResolutionGuard !== false ? 'Đang bật' : 'Đã tắt'}
              </span>
            </div>
            <div className="text-[10px] mt-0.5 text-slate-300/90">
              Tự động tinh chỉnh tỷ lệ pixel GPU khi FPS xuống dưới 44 để giữ mượt khi đấu Đại Boss.
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onUpdateSettings({
                autoGpuWatchdog: settings.autoGpuWatchdog === false,
              });
            }}
            className={`col-span-2 p-3 rounded-xl border text-left cursor-pointer transition-colors ${
              settings.autoGpuWatchdog !== false
                ? 'bg-sky-500/15 border-sky-400/55 text-sky-100'
                : 'bg-[#080d1e] border-slate-700 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black">Watchdog GPU Tự Hạ Đồ Họa Toàn Hệ Thống (Laptop Yếu / E5430)</span>
              <span className="text-[11px] font-bold shrink-0">
                {settings.autoGpuWatchdog !== false ? 'Đang bảo vệ' : 'Đã tắt'}
              </span>
            </div>
            <div className="text-[10px] mt-0.5 text-slate-300/90">
              Tự động giảm Bloom → Bóng → Hạt VFX → DPR → Lite khẩn cấp nếu tụt dưới 26 FPS kéo dài ở mọi chương.
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onUpdateSettings({
                adaptiveChapterMusic: settings.adaptiveChapterMusic === false,
              });
            }}
            className={`col-span-2 p-3 rounded-xl border text-left cursor-pointer transition-colors ${
              settings.adaptiveChapterMusic !== false
                ? 'bg-amber-500/15 border-amber-400/55 text-amber-100'
                : 'bg-[#080d1e] border-slate-700 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black">Nhạc Nền Động Hoàng Đạo Theo Chương &amp; Pha Boss</span>
              <span className="text-[11px] font-bold shrink-0">
                {settings.adaptiveChapterMusic !== false ? 'Đang bật' : 'Giai điệu chuẩn'}
              </span>
            </div>
            <div className="text-[10px] mt-0.5 text-slate-300/90">
              Mỗi Chương Hoàng Đạo (Ch.1–12) có chủ đề nhạc nền riêng và đẩy cao trào theo Pha Boss I–III.
            </div>
          </button>

          {/* Wave 12: Built-in 15s / 60s E5430 FPS 1% Low Field QA Benchmark Tool */}
          {onStartFrameBenchmark && (
            <div
              data-testid="e5430-benchmark-panel"
              className="col-span-2 p-3.5 rounded-xl border border-emerald-400/35 bg-[#070e1d] space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-black text-emerald-200 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                    <span>Kiểm Định Hiệu Năng 60 Giây (FPS 1% Low · E5430 Field QA)</span>
                  </div>
                  <div className="text-[10px] text-slate-300/85 mt-0.5">
                    Đo trực tiếp khung hình thực tế Zero-GC (FPS TB, 1% Low, P95/P99 ms, Draw Calls, 0 PointLights) và xuất báo cáo JSON.
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {!benchLive?.running ? (
                    <>
                      <button
                        type="button"
                        data-testid="benchmark-run-15s"
                        onClick={() => handleStartBench(15)}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-black bg-sky-500/20 border border-sky-400/60 text-sky-100 hover:bg-sky-500/30 cursor-pointer"
                      >
                        Chạy Nhanh 15s
                      </button>
                      <button
                        type="button"
                        data-testid="benchmark-run-60s"
                        onClick={() => handleStartBench(60)}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-black bg-emerald-500/20 border border-emerald-400/60 text-emerald-100 hover:bg-emerald-500/30 cursor-pointer"
                      >
                        Chạy Chuẩn 60s
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      data-testid="benchmark-stop"
                      onClick={handleStopBench}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-black bg-rose-500/20 border border-rose-400/60 text-rose-100 hover:bg-rose-500/30 cursor-pointer"
                    >
                      Dừng &amp; Chốt Báo Cáo
                    </button>
                  )}
                </div>
              </div>

              {benchLive?.running && (
                <div className="space-y-1.5 pt-1 border-t border-slate-800/80 tabular-nums">
                  <div className="flex items-center justify-between text-[11px] text-emerald-200 font-bold">
                    <span>
                      Đang thu mẫu: {benchLive.elapsedSec}s / {benchLive.durationSec}s ({benchLive.sampleCount} khung)
                    </span>
                    <span>{benchLive.progressPct}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-[width] duration-200"
                      style={{ width: `${benchLive.progressPct}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="bg-[#0b1428] border border-slate-800 rounded-lg px-2 py-1.5">
                      <div className="text-[10px] text-slate-400">FPS Trực Tiếp</div>
                      <div className="font-black text-amber-300 font-mono-nums">{benchLive.liveAvgFps}</div>
                    </div>
                    <div className="bg-[#0b1428] border border-slate-800 rounded-lg px-2 py-1.5">
                      <div className="text-[10px] text-slate-400">1% Low Ước Tính</div>
                      <div className="font-black text-emerald-300 font-mono-nums">{benchLive.liveEst1LowFps}</div>
                    </div>
                    <div className="bg-[#0b1428] border border-slate-800 rounded-lg px-2 py-1.5">
                      <div className="text-[10px] text-slate-400">Draw Calls</div>
                      <div className="font-black text-sky-300 font-mono-nums">{benchLive.liveDrawCalls}</div>
                    </div>
                    <div className="bg-[#0b1428] border border-slate-800 rounded-lg px-2 py-1.5">
                      <div className="text-[10px] text-slate-400">PointLights</div>
                      <div className="font-black text-emerald-300 font-mono-nums">{benchLive.activePointLights}</div>
                    </div>
                  </div>
                </div>
              )}

              {benchReport && !benchLive?.running && (
                <div
                  data-testid="e5430-benchmark-report"
                  className="space-y-2 pt-2 border-t border-slate-800/80 tabular-nums"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="font-black text-amber-200">
                      Kết Quả ({benchReport.elapsedSec}s · {benchReport.sampleCount} khung) —{' '}
                      {benchReport.verdict === 'DAT_E5430_60FPS'
                        ? 'Đạt Chuẩn E5430 60 FPS'
                        : benchReport.verdict === 'DAT_E5430_30FPS_ON_DINH'
                          ? 'Ổn Định E5430 30+ FPS'
                          : 'Cần Tối Ưu Thêm'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        data-testid="benchmark-copy-json"
                        onClick={handleCopyBenchJson}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#0d1830] border border-slate-700 text-slate-200 hover:border-amber-300 flex items-center gap-1 cursor-pointer"
                      >
                        {benchCopied ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                        <span>{benchCopied ? 'Đã Chép JSON' : 'Sao Chép JSON'}</span>
                      </button>
                      <button
                        type="button"
                        data-testid="benchmark-download-json"
                        onClick={handleDownloadBenchJson}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-500/20 border border-amber-400/55 text-amber-100 hover:bg-amber-500/30 flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>Tải JSON</span>
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                    <div className="bg-[#0b1428] border border-slate-800 rounded-lg px-2 py-1.5">
                      <div className="text-[10px] text-slate-400">FPS Trung Bình</div>
                      <div className="font-black text-amber-300 font-mono-nums">{benchReport.avgFps}</div>
                    </div>
                    <div className="bg-[#0b1428] border border-slate-800 rounded-lg px-2 py-1.5">
                      <div className="text-[10px] text-slate-400">FPS 1% Low</div>
                      <div className="font-black text-emerald-300 font-mono-nums">{benchReport.fps1Low}</div>
                    </div>
                    <div className="bg-[#0b1428] border border-slate-800 rounded-lg px-2 py-1.5">
                      <div className="text-[10px] text-slate-400">P95 / P99 ms</div>
                      <div className="font-black text-sky-300 font-mono-nums">
                        {benchReport.p95FrameMs} / {benchReport.p99FrameMs}
                      </div>
                    </div>
                    <div className="bg-[#0b1428] border border-slate-800 rounded-lg px-2 py-1.5">
                      <div className="text-[10px] text-slate-400">Draw Calls (TB/Đỉnh)</div>
                      <div className="font-black text-slate-100 font-mono-nums">
                        {benchReport.avgDrawCalls} / {benchReport.peakDrawCalls}
                      </div>
                    </div>
                    <div className="bg-[#0b1428] border border-slate-800 rounded-lg px-2 py-1.5">
                      <div className="text-[10px] text-slate-400">PointLights / Lite</div>
                      <div className="font-black text-emerald-300 font-mono-nums">
                        {benchReport.activePointLights} / {benchReport.liteActive ? 'Bật' : 'Tắt'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* AAA Wave 4: Controls, Haptics & Accessibility */}
        <div className="space-y-2.5 border-t border-amber-400/20 pt-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Gamepad2 className="w-4 h-4 shrink-0" />
              <span>Điều Khiển &amp; Trợ Năng</span>
            </span>
            <span
              className={`text-[10px] font-bold truncate max-w-[180px] ${
                gamepadLabel ? 'text-emerald-300' : 'text-slate-400'
              }`}
              title={gamepadLabel ?? 'Chưa kết nối tay cầm'}
            >
              {gamepadLabel ? `Tay cầm: ${gamepadLabel}` : 'Sẵn sàng Tay Cầm Gamepad'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => {
                const next = settings.hapticsEnabled === false;
                soundEngine.playUiClick();
                if (next) triggerHapticPulse('crit', true);
                onUpdateSettings({ hapticsEnabled: next });
              }}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                settings.hapticsEnabled !== false
                  ? 'bg-emerald-500/15 border-emerald-400/55 text-emerald-100'
                  : 'bg-[#080d1e] border-slate-700 text-slate-400'
              }`}
            >
              <div className="text-xs font-black">Rung Phản Hồi</div>
              <div className="text-[11px] mt-0.5 font-semibold">
                {settings.hapticsEnabled !== false ? 'Đang bật' : 'Đã tắt'}
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                const next = !(settings.colorblindTelegraphs || settings.highContrastTelegraphs);
                onUpdateSettings({
                  highContrastTelegraphs: next,
                  colorblindTelegraphs: next,
                });
              }}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                settings.colorblindTelegraphs || settings.highContrastTelegraphs
                  ? 'bg-sky-500/15 border-sky-400/65 text-sky-100'
                  : 'bg-[#080d1e] border-slate-700 text-slate-400'
              }`}
            >
              <div className="text-xs font-black">Hình Học Báo Đòn (Mù Màu)</div>
              <div className="text-[11px] mt-0.5 font-semibold">
                {settings.colorblindTelegraphs || settings.highContrastTelegraphs
                  ? 'Vòng Đôi · Xanh/Vàng'
                  : 'Mặc định'}
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onUpdateSettings({
                  compactHud: !settings.compactHud,
                });
              }}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                settings.compactHud
                  ? 'bg-amber-500/18 border-amber-400/70 text-amber-100'
                  : 'bg-[#080d1e] border-slate-700 text-slate-400'
              }`}
            >
              <div className="text-xs font-black">Chế Độ HUD Gọn</div>
              <div className="text-[11px] mt-0.5 font-semibold">
                {settings.compactHud ? 'Đang bật · Thoáng map' : 'Tiêu chuẩn'}
              </div>
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
              <span>Tỷ Lệ HUD Trong Trận</span>
              <span className="text-[10px] text-slate-400">A Lướt · X Kỹ Năng · Y Chiêu Cuối</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {hudScaleOptions.map((opt) => {
                const currentScale: HudScaleMode = settings.hudScale ?? 'normal';
                const active = currentScale === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick(1.04);
                      onUpdateSettings({ hudScale: opt.id });
                    }}
                    className={`py-1.5 px-2 rounded-xl text-center border cursor-pointer transition-colors ${
                      active
                        ? 'a2-yellow-btn'
                        : 'bg-[#080d1e] border-amber-400/25 text-slate-200 hover:border-amber-300'
                    }`}
                  >
                    <div className="text-xs font-black">{opt.label}</div>
                    <div
                      className={`text-[10px] font-mono-nums ${
                        active ? 'text-slate-900 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {opt.hint}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* AAA Wave 5: Combat Camera Rig & Live DPS Meter */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
              <span>Góc Camera Chiến Đấu 3D</span>
              <span className="text-[10px] text-slate-400">Chuyển mượt trong trận</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {combatCameraOptions.map((opt) => {
                const currentCam: CombatCameraPreset = settings.combatCameraPreset ?? 'tactical';
                const active = currentCam === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick(1.05);
                      onUpdateSettings({ combatCameraPreset: opt.id });
                    }}
                    className={`py-1.5 px-2 rounded-xl text-center border cursor-pointer transition-colors ${
                      active
                        ? 'a2-yellow-btn'
                        : 'bg-[#080d1e] border-amber-400/25 text-slate-200 hover:border-amber-300'
                    }`}
                  >
                    <div className="text-xs font-black">{opt.label}</div>
                    <div
                      className={`text-[10px] ${
                        active ? 'text-slate-900 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {opt.hint}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onUpdateSettings({ liveDpsMeter: !settings.liveDpsMeter });
              }}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                settings.liveDpsMeter
                  ? 'bg-emerald-500/15 border-emerald-400/55 text-emerald-100'
                  : 'bg-[#080d1e] border-slate-700 text-slate-300'
              }`}
            >
              <div className="text-xs font-black">Bảng Đo DPS (5s)</div>
              <div className="text-[11px] mt-0.5 font-semibold">
                {settings.liveDpsMeter ? 'Đang bật' : 'Đã tắt'}
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onUpdateSettings({ showFpsOverlay: !settings.showFpsOverlay });
              }}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                settings.showFpsOverlay
                  ? 'bg-sky-500/15 border-sky-400/55 text-sky-100'
                  : 'bg-[#080d1e] border-slate-700 text-slate-300'
              }`}
            >
              <div className="text-xs font-black">Hiển Thị FPS &amp; ms</div>
              <div className="text-[11px] mt-0.5 font-semibold">
                {settings.showFpsOverlay ? 'Đang hiện góc HUD' : 'Đã tắt'}
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                const next = !settings.reducedMotion;
                onUpdateSettings({
                  reducedMotion: next,
                  ...(next ? { screenShake: false } : {}),
                });
              }}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                settings.reducedMotion
                  ? 'bg-emerald-500/15 border-emerald-400/55 text-emerald-100'
                  : 'bg-[#080d1e] border-slate-700 text-slate-300'
              }`}
            >
              <div className="text-xs font-black">Giảm Chuyển Động</div>
              <div className="text-[11px] mt-0.5 font-semibold">
                {settings.reducedMotion ? 'Đang bật (Tắt rung & chớp)' : 'Tắt (Hiệu ứng chuẩn)'}
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onUpdateSettings({ reduceScreenFlash: !settings.reduceScreenFlash });
              }}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                settings.reduceScreenFlash
                  ? 'bg-emerald-500/15 border-emerald-400/55 text-emerald-100'
                  : 'bg-[#080d1e] border-slate-700 text-slate-300'
              }`}
            >
              <div className="text-xs font-black">Giảm Chớp Sáng (Anti-Flash)</div>
              <div className="text-[11px] mt-0.5 font-semibold">
                {settings.reduceScreenFlash ? 'Đang bật (Giảm 75% lóe sáng)' : 'Tắt (Ánh sáng chuẩn)'}
              </div>
            </button>

            <button
              type="button"
              data-testid="setting-audio-captions"
              onClick={() => {
                soundEngine.playUiClick();
                onUpdateSettings({ audioCaptions: !settings.audioCaptions });
              }}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                settings.audioCaptions
                  ? 'bg-emerald-500/15 border-emerald-400/55 text-emerald-100'
                  : 'bg-[#080d1e] border-slate-700 text-slate-300'
              }`}
            >
              <div className="text-xs font-black">Phụ Đề Âm Thanh Chiến Đấu</div>
              <div className="text-[11px] mt-0.5 font-semibold">
                {settings.audioCaptions
                  ? 'Đang bật (Hiển thị phụ đề cảnh báo Boss, Phản Tiễn & Rơi Đồ)'
                  : 'Tắt (Hỗ trợ người khiếm thính hoặc chơi tắt tiếng)'}
              </div>
            </button>

            <div className="p-3 rounded-xl border bg-[#080d1e] border-slate-700/90 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-black text-white">Cỡ Chữ Giao Diện</div>
                <span className="text-[10px] font-mono-nums text-amber-300 font-bold">
                  {settings.uiTextScale === 'xlarge'
                    ? '130%'
                    : settings.uiTextScale === 'large'
                    ? '115%'
                    : '100%'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'normal', label: '100%' },
                    { id: 'large', label: '115%' },
                    { id: 'xlarge', label: '130%' },
                  ] as const
                ).map((opt) => {
                  const active = (settings.uiTextScale ?? 'normal') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick(1.04);
                        onUpdateSettings({ uiTextScale: opt.id });
                      }}
                      className={`py-1 px-1.5 rounded-lg text-[11px] font-black font-mono-nums border cursor-pointer transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-amber-400/20 border-amber-300 text-amber-200'
                          : 'bg-[#0b1126] border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* AAA Wave 6: Customizable PC Combat Keybinds */}
          <div className="space-y-2 pt-2 border-t border-amber-400/15">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5 shrink-0" />
                <span>Phím Tắt Chiến Đấu (PC)</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick(0.96);
                  setCapturingKeyAction(null);
                  setKeybindNotice(null);
                  onUpdateSettings({ keybinds: { ...DEFAULT_COMBAT_KEYBINDS } });
                }}
                className="text-[10px] font-bold text-amber-300 hover:text-amber-200 underline underline-offset-2 cursor-pointer whitespace-nowrap"
              >
                Khôi phục mặc định
              </button>
            </div>

            <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl bg-[#070b18]">
              {COMBAT_KEYBIND_META.map((item) => {
                const isCapturing = capturingKeyAction === item.action;
                const keyLabel = formatKeybindShortLabel(activeKeybinds[item.action]);
                return (
                  <div
                    key={item.action}
                    className="px-3 py-2 flex items-center justify-between gap-2.5"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-100 truncate">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{item.hint}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick(1.05);
                        setKeybindNotice(null);
                        setCapturingKeyAction(isCapturing ? null : item.action);
                      }}
                      className={`px-2.5 py-1 rounded-lg border font-mono-nums text-[11px] font-black whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                        isCapturing
                          ? 'bg-amber-400/20 border-amber-300 text-amber-200'
                          : 'bg-[#0b1124] border-slate-700 hover:border-amber-300/70 text-slate-100'
                      }`}
                    >
                      {isCapturing ? 'Nhấn phím…' : keyLabel}
                    </button>
                  </div>
                );
              })}
            </div>

            {capturingKeyAction && (
              <div className="text-[10px] font-semibold text-amber-200/90">
                Nhấn phím mới để gán · Trùng phím sẽ tự động hoán đổi · Nhấn ESC để hủy.
              </div>
            )}
            {keybindNotice && (
              <div className="text-[10px] font-semibold text-rose-300">{keybindNotice}</div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          {onReplayTutorial && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onReplayTutorial();
                onClose();
              }}
              className="a2-slate-btn w-full py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
              <span>Xem Lại Hướng Dẫn Tân Thủ</span>
            </button>
          )}
          {save && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick(1.02);
                  setShowPlaytestKpi(true);
                }}
                className="w-full py-2 px-3 rounded-xl text-[11px] font-bold text-slate-300 hover:text-amber-200 border border-slate-800 hover:border-amber-400/35 bg-[#070b18] flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
              >
                <BarChart3 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Dữ Liệu Playtest &amp; KPI</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick(1.04);
                  setShowSaveTransfer(true);
                }}
                className="w-full py-2 px-3 rounded-xl text-[11px] font-bold text-slate-300 hover:text-sky-200 border border-slate-800 hover:border-sky-400/40 bg-[#070b18] flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Sao Lưu / Khôi Phục Save</span>
              </button>
            </div>
          )}
          {isVerifiedAdmin && onOpenAdminLiveOps && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick(1.08);
                onOpenAdminLiveOps();
              }}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-black text-amber-100 border border-amber-400/55 bg-amber-500/15 hover:bg-amber-500/25 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
              <span>Bảng Quản Trị &amp; Cân Bằng LiveOps</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onClose();
              window.location.hash = '#/admin/assets?tab=deploy';
            }}
            className="w-full py-2 px-3 rounded-xl text-[11px] font-bold text-slate-300 hover:text-amber-200 border border-slate-800 hover:border-amber-400/35 bg-[#070b18] flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>Quản Trị 3D &amp; Đồng Bộ CDN</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onClose();
            }}
            className="a2-yellow-btn w-full py-2.5 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap"
          >
            Lưu &amp; Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
