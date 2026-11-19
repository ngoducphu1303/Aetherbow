import React, { useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Flame, ShieldAlert, Sparkles, Skull, X } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { buildBossCodexEntries, buildSynergyCodexEntries } from '../data/phase5Data';
import { SaveData } from '../types/game';

interface CodexGuideModalProps {
  save: SaveData;
  initialTab?: 'synergies' | 'bosses';
  onClose: () => void;
}

const NIGHTMARE_ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

export const CodexGuideModal: React.FC<CodexGuideModalProps> = ({
  save,
  initialTab = 'synergies',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'synergies' | 'bosses'>(initialTab);

  const synergyEntries = useMemo(() => buildSynergyCodexEntries(save), [save]);
  const bossEntries = useMemo(() => buildBossCodexEntries(save), [save]);

  const discoveredCount = useMemo(
    () => synergyEntries.filter((entry) => entry.discovered).length,
    [synergyEntries]
  );
  const clearedBossCount = useMemo(
    () => bossEntries.filter((entry) => entry.cleared).length,
    [bossEntries]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#030612]/90"
      role="dialog"
      aria-modal="true"
      aria-label="Sổ Tay Cộng Hưởng và Boss Hoàng Đạo"
    >
      <div className="cel-panel-ornate w-full max-w-3xl max-h-[88vh] rounded-3xl flex flex-col overflow-hidden a2-modal-enter">
        {/* Header */}
        <div className="px-5 py-4 border-b border-amber-400/20 flex items-center justify-between gap-3 bg-[#090f24]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg sm:text-xl font-black text-white truncate">
                Sổ Tay Chiến Thuật &amp; Hoàng Đạo
              </h2>
              <p className="text-[11px] font-semibold text-slate-300 font-mono-nums truncate">
                Cộng Hưởng: {discoveredCount}/{synergyEntries.length} đã kích hoạt · Boss Hoàng Đạo:{' '}
                {clearedBossCount}/{bossEntries.length} đã hạ gục
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onClose();
            }}
            aria-label="Đóng sổ tay"
            className="w-9 h-9 rounded-xl bg-[#0d142b] border border-amber-400/25 flex items-center justify-center text-slate-300 hover:text-white hover:border-amber-300 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Tab Switcher */}
        <div className="px-5 pt-3 pb-2 bg-[#070b1a] border-b border-amber-400/15 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(1.04);
              setActiveTab('synergies');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'synergies'
                ? 'bg-amber-400/15 border-amber-300 text-amber-200'
                : 'bg-[#0b1126] border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>
              Cộng Hưởng Kỹ Năng (<span className="font-mono-nums">{synergyEntries.length}</span>)
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(1.04);
              setActiveTab('bosses');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'bosses'
                ? 'bg-rose-500/15 border-rose-400 text-rose-200'
                : 'bg-[#0b1126] border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Skull className="w-3.5 h-3.5 shrink-0" />
            <span>
              Đại Boss Hoàng Đạo (<span className="font-mono-nums">Ch.1–{bossEntries.length}</span>)
            </span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-[#060a17]">
          {activeTab === 'synergies' ? (
            <div className="space-y-3">
              <div className="text-xs text-slate-300 leading-relaxed bg-[#0a1024] border border-amber-400/20 rounded-xl px-3.5 py-2.5">
                Chọn ít nhất 1 kỹ năng từ <strong className="text-amber-200">Nhánh A</strong> và 1 kỹ
                năng từ <strong className="text-sky-200">Nhánh B</strong> trong cùng một trận chiến
                để kích hoạt tức thì hiệu ứng Cộng Hưởng 3D.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {synergyEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`rounded-2xl border p-3.5 transition-colors ${
                      entry.discovered
                        ? 'bg-[#0c1329] border-amber-400/35'
                        : 'bg-[#080d1c] border-slate-800/90'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-xs shrink-0"
                            style={{ backgroundColor: entry.accentColor }}
                          />
                          <h3 className="font-display text-sm font-black text-white truncate">
                            {entry.name}
                          </h3>
                        </div>
                        <div className="mt-0.5 text-[11px] font-semibold text-slate-400">
                          {entry.buildTag} ·{' '}
                          {entry.discovered ? (
                            <span className="text-emerald-300 font-mono-nums">
                              Đã kích hoạt ×{entry.pickCount}
                            </span>
                          ) : (
                            <span className="text-slate-500">Chưa khám phá</span>
                          )}
                        </div>
                      </div>
                      {entry.discovered && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      )}
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1 text-[11px]">
                      <div className="text-slate-300">
                        <span className="font-bold text-amber-200">Nhánh A:</span>{' '}
                        {entry.groupALabels.join(' / ')}
                      </div>
                      <div className="text-slate-300">
                        <span className="font-bold text-sky-200">Nhánh B:</span>{' '}
                        {entry.groupBLabels.join(' / ')}
                      </div>
                    </div>

                    <p className="mt-2 text-xs text-slate-200 leading-relaxed">
                      {entry.shortEffect}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-slate-300 leading-relaxed bg-[#0a1024] border border-rose-400/20 rounded-xl px-3.5 py-2.5">
                Boss Ch.1–9 mở <strong className="text-amber-200">Pha II (≤50% HP)</strong> kèm cửa
                sổ Phản Đòn <strong className="text-emerald-300 font-mono-nums">+18%</strong>. Boss
                Ch.10–12 mở thêm <strong className="text-rose-300">Pha III (≤25% HP)</strong> với
                thưởng Phản Đòn <strong className="text-amber-300 font-mono-nums">+24%</strong>.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {bossEntries.map((boss) => (
                  <div
                    key={boss.chapterId}
                    className={`rounded-2xl border p-3.5 ${
                      boss.cleared
                        ? 'bg-[#0c1329] border-amber-400/35'
                        : 'bg-[#080d1c] border-slate-800/90'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-amber-300 font-mono-nums">
                          Chương {boss.chapterId} · {boss.chapterName}
                        </div>
                        <h3 className="font-display text-sm font-black text-white truncate mt-0.5">
                          {boss.bossName}
                        </h3>
                      </div>
                      {boss.cleared ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                      )}
                    </div>

                    <div className="mt-1.5 text-[11px] font-semibold text-slate-400 font-mono-nums flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      <span>{boss.hasPhaseThree ? 'Pha II & Pha III' : 'Pha II ≤50% HP'}</span>
                      <span>·</span>
                      <span className="text-emerald-300">Phản Đòn +{boss.punishBonusPct}%</span>
                      <span>·</span>
                      <span>{boss.attempts} lượt chạm trán</span>
                      {boss.highestNightmareTier > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-rose-300 inline-flex items-center gap-0.5">
                            <Flame className="w-3 h-3" />
                            Ác Mộng {NIGHTMARE_ROMAN[boss.highestNightmareTier] ?? boss.highestNightmareTier}
                          </span>
                        </>
                      )}
                    </div>

                    <p className="mt-2 pt-2 border-t border-slate-800/80 text-xs text-slate-200 leading-relaxed">
                      {boss.tacticalTip}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
