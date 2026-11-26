import React, { useEffect } from 'react';
import { Compass, Shield, Sparkles, Swords, X, Zap } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import type {
  PreBattleTacticalBriefing,
  TacticalBottleneckTarget,
} from '../data/wave16TacticalAndLiveOps';

interface PreBattleBriefingModalProps {
  briefing: PreBattleTacticalBriefing;
  onClose: () => void;
  onLaunchBattle: () => void;
  onJumpToUpgrade: (target: TacticalBottleneckTarget) => void;
}

export const PreBattleBriefingModal: React.FC<PreBattleBriefingModalProps> = ({
  briefing,
  onClose,
  onLaunchBattle,
  onJumpToUpgrade,
}) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const ratioPct = Math.max(0, Math.min(100, Math.round(briefing.powerRatio * 100)));
  const readinessTone =
    briefing.readinessTier === 'ready'
      ? 'text-emerald-300'
      : briefing.readinessTier === 'challenging'
        ? 'text-amber-300'
        : 'text-rose-300';
  const barTone =
    briefing.readinessTier === 'ready'
      ? 'bg-emerald-400'
      : briefing.readinessTier === 'challenging'
        ? 'bg-amber-400'
        : 'bg-rose-400';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="briefing-modal-title"
      data-testid="pre-battle-briefing-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto a2-scroll rounded-2xl bg-[#0d111a] border border-amber-400/35 shadow-2xl p-4 sm:p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
              Tóm Tắt Chiến Thuật Trước Trận · Cung {briefing.zodiacName}
            </div>
            <h2
              id="briefing-modal-title"
              className="font-display text-lg sm:text-xl font-black text-white text-balance mt-0.5"
            >
              {briefing.chapterName}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Thủ Lĩnh: <span className="text-amber-200 font-bold">{briefing.bossName}</span> —{' '}
              {briefing.bossEpithet}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onClose();
            }}
            aria-label="Đóng Tóm tắt Chiến thuật"
            className="w-8 h-8 rounded-lg bg-[#141b2d] border border-slate-700 hover:border-amber-300 text-slate-300 hover:text-white flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Combat Power Readiness & Weakest Bottleneck */}
        <div className="rounded-xl bg-[#111726] border border-slate-800 p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-300 shrink-0" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                Đánh Giá Lực Chiến
              </span>
            </div>
            <span className={`text-xs font-black ${readinessTone}`}>{briefing.readinessLabel}</span>
          </div>

          <div className="flex items-center justify-between text-xs font-mono-nums tabular-nums">
            <span className="text-white font-black">
              Của bạn: {briefing.playerPower.toLocaleString('vi-VN')} LC
            </span>
            <span className="text-slate-400">
              Khuyến nghị: {briefing.recommendedPower.toLocaleString('vi-VN')} LC ({ratioPct}%)
            </span>
          </div>

          <div className="h-2 rounded-sm bg-slate-900 overflow-hidden border border-slate-800">
            <div className={`h-full ${barTone}`} style={{ width: `${ratioPct}%` }} />
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-amber-200">
                Điểm tối ưu nhất: {briefing.weakestBottleneck.label}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                {briefing.weakestBottleneck.tip}
              </p>
            </div>
            <button
              type="button"
              data-testid="briefing-jump-upgrade"
              onClick={() => {
                soundEngine.playUiClick(1.06);
                onJumpToUpgrade(briefing.weakestBottleneck.target);
              }}
              className="px-3.5 py-2 rounded-lg bg-[#19233c] border border-amber-400/50 hover:border-amber-200 text-amber-200 text-xs font-black whitespace-nowrap shrink-0 cursor-pointer"
            >
              Nâng Ngay · {briefing.weakestBottleneck.ctaLabel}
            </button>
          </div>
        </div>

        {/* Wave 17: Smart Upgrade ROI Advisor (+LC / 1.000 Vàng) */}
        {briefing.smartUpgradeRoi && briefing.smartUpgradeRoi.length > 0 && (
          <div
            data-testid="briefing-smart-roi"
            className="rounded-xl bg-[#111726] border border-emerald-500/30 p-3.5 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-300 shrink-0" />
                <span className="text-xs font-black uppercase tracking-wider text-emerald-200">
                  Gợi Ý Đầu Tư LC Tối Ưu (+LC / 1.000 Vàng)
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                Top {briefing.smartUpgradeRoi.length} hiệu suất cao nhất
              </span>
            </div>
            <div className="space-y-1.5">
              {briefing.smartUpgradeRoi.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="rounded-lg bg-[#0a0f1c] border border-slate-800 px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 text-xs font-black text-white">
                      <span className="font-mono-nums tabular-nums text-amber-300">#{idx + 1}</span>
                      <span className="truncate">{entry.title}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 leading-snug">{entry.detail}</div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right font-mono-nums tabular-nums">
                      <div className="text-xs font-black text-emerald-300">
                        +{entry.lcPer1000Gold} LC / 1k Vàng
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400">
                        {entry.affordableNow ? 'Đủ tài nguyên' : 'Cần thêm Vàng'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick(1.08);
                        onJumpToUpgrade(entry.targetTab);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-[#16213a] border border-emerald-400/45 hover:border-emerald-300 text-emerald-200 text-[11px] font-black whitespace-nowrap cursor-pointer"
                    >
                      {entry.actionLabel}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Boss Phase II & Phase III Counterplay */}
        <div className="rounded-xl bg-[#111726] border border-slate-800 p-3.5 space-y-2.5">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-rose-300 shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-200">
              Khắc Chế Thủ Lĩnh ({briefing.bossName})
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="rounded-lg bg-[#0a0f1c] border border-slate-800 p-3 space-y-1">
              <div className="text-[11px] font-black text-amber-300">{briefing.bossPhase2Title}</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {briefing.bossPhase2Counterplay}
              </p>
            </div>
            <div className="rounded-lg bg-[#0a0f1c] border border-slate-800 p-3 space-y-1">
              <div className="text-[11px] font-black text-rose-300">{briefing.bossPhase3Title}</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {briefing.bossPhase3Counterplay}
              </p>
            </div>
          </div>
        </div>

        {/* Arena Mechanism & Crossroads Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-[#111726] border border-slate-800 p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
              <span className="text-[11px] font-black uppercase tracking-wider text-cyan-200">
                Cơ Quan Đấu Trường · {briefing.arenaMechanismShort}
              </span>
            </div>
            <div className="text-xs font-bold text-white">{briefing.arenaMechanismName}</div>
            <p className="text-xs text-slate-400 leading-relaxed">{briefing.arenaMechanismTip}</p>
          </div>

          <div className="rounded-xl bg-[#111726] border border-slate-800 p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-200">
                Nhịp Phòng &amp; Ngã Rẽ
              </span>
            </div>
            <div className="text-xs font-bold text-white">
              {briefing.crossroadsPreview.headline}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {briefing.crossroadsPreview.detail}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onClose();
            }}
            className="px-4 py-2.5 rounded-xl bg-[#141b2d] border border-slate-700 hover:border-slate-500 text-slate-200 text-xs font-bold cursor-pointer"
          >
            Quay Lại Sảnh
          </button>
          <button
            type="button"
            data-testid="briefing-launch-battle"
            onClick={() => {
              soundEngine.playUiClick(1.1);
              onLaunchBattle();
            }}
            className="a2-yellow-btn px-5 py-2.5 rounded-xl font-display font-black text-xs sm:text-sm tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Vào Trận Ngay</span>
          </button>
        </div>
      </div>
    </div>
  );
};
