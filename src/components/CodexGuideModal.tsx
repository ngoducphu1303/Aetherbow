import React, { useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Compass, Flame, GitBranch, Sparkles, Skull, Star, Trophy, X, Zap } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { buildBossCodexEntries, buildSynergyCodexEntries } from '../data/phase5Data';
import { getZodiacChapterLore } from '../data/zodiacWorldLore';
import { evaluateZodiacJourneyProgress } from '../data/zodiacJourneyLog';
import { buildEvolutionCodexEntries } from '../engine/skillEvolutionEngine';
import {
  EXTENDED_ELEMENTAL_REACTION_GUIDE,
  buildPersonalRecordsSummary,
} from '../engine/aaaWave5Director';
import { SaveData } from '../types/game';
import { BossPortraitBadge } from './GameIcons';

interface CodexGuideModalProps {
  save: SaveData;
  initialTab?: 'journey' | 'synergies' | 'evolutions' | 'bosses' | 'reactions';
  onClaimJourneyMilestone?: (milestoneId: string) => void;
  onClose: () => void;
}

const NIGHTMARE_ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

export const CodexGuideModal: React.FC<CodexGuideModalProps> = ({
  save,
  initialTab = 'synergies',
  onClaimJourneyMilestone,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'journey' | 'synergies' | 'evolutions' | 'bosses' | 'reactions'>(initialTab);
  const [journeyFilter, setJourneyFilter] = useState<'all' | 'claimable' | 'completed'>('all');

  const journeyProgress = useMemo(() => evaluateZodiacJourneyProgress(save), [save]);
  const synergyEntries = useMemo(() => buildSynergyCodexEntries(save), [save]);
  const evolutionEntries = useMemo(() => buildEvolutionCodexEntries(save), [save]);
  const bossEntries = useMemo(() => buildBossCodexEntries(save), [save]);
  const personalRecords = useMemo(() => buildPersonalRecordsSummary(save), [save]);

  const discoveredCount = useMemo(
    () => synergyEntries.filter((entry) => entry.discovered).length,
    [synergyEntries]
  );
  const discoveredEvoCount = useMemo(
    () => evolutionEntries.filter((entry) => entry.discovered).length,
    [evolutionEntries]
  );
  const clearedBossCount = useMemo(
    () => bossEntries.filter((entry) => entry.cleared).length,
    [bossEntries]
  );
  const filteredJourneyChapters = useMemo(() => {
    if (journeyFilter === 'claimable') {
      return journeyProgress.chapters.filter((ch) => ch.claimableCount > 0);
    }
    if (journeyFilter === 'completed') {
      return journeyProgress.chapters.filter((ch) => ch.claimedCount > 0 || ch.bossCleared);
    }
    return journeyProgress.chapters;
  }, [journeyProgress.chapters, journeyFilter]);

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
                Cộng Hưởng: {discoveredCount}/{synergyEntries.length} · Tiến Hóa:{' '}
                {discoveredEvoCount}/{evolutionEntries.length} · Boss Hoàng Đạo:{' '}
                {clearedBossCount}/{bossEntries.length}
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
        <div className="px-5 pt-3 pb-2 bg-[#070b1a] border-b border-amber-400/15 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(1.04);
              setActiveTab('journey');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'journey'
                ? 'bg-amber-400/15 border-amber-300 text-amber-200'
                : 'bg-[#0b1126] border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5 shrink-0" />
            <span>
              Hành Trình (<span className="font-mono-nums">{journeyProgress.claimedCount}/{journeyProgress.totalMilestones}</span>)
              {journeyProgress.claimableCount > 0 && (
                <span className="ml-1 text-emerald-300 font-mono-nums">
                  · +{journeyProgress.claimableCount}
                </span>
              )}
            </span>
          </button>

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
              Cộng Hưởng (<span className="font-mono-nums">{synergyEntries.length}</span>)
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(1.04);
              setActiveTab('evolutions');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'evolutions'
                ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200'
                : 'bg-[#0b1126] border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 shrink-0" />
            <span>
              Tiến Hóa (<span className="font-mono-nums">{discoveredEvoCount}/{evolutionEntries.length}</span>)
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
              Boss &amp; Thế Giới (<span className="font-mono-nums">Ch.1–{bossEntries.length}</span>)
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(1.04);
              setActiveTab('reactions');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'reactions'
                ? 'bg-sky-500/15 border-sky-400 text-sky-200'
                : 'bg-[#0b1126] border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 shrink-0" />
            <span>Phản Ứng &amp; Kỷ Lục</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-[#060a17]">
          {activeTab === 'journey' ? (
            <div className="space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#0a1024] border border-amber-400/20 rounded-xl px-3.5 py-2.5">
                <div className="text-xs text-slate-200 font-mono-nums">
                  Tiến độ Hành Trình 12 Cung:{' '}
                  <strong className="text-amber-300">
                    {journeyProgress.completedCount}/{journeyProgress.totalMilestones}
                  </strong>
                  {' · '}Ấn Triện Hoàng Đạo:{' '}
                  <strong className="text-emerald-300">{journeyProgress.sealsEarnedCount}/12</strong>
                  {journeyProgress.claimableCount > 0 && (
                    <>
                      {' · '}Chờ nhận:{' '}
                      <strong className="text-sky-300">{journeyProgress.claimableCount}</strong>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {(
                    [
                      { id: 'all', label: 'Tất cả (12)' },
                      { id: 'claimable', label: `Có thể nhận (${journeyProgress.claimableCount})` },
                      { id: 'completed', label: 'Đã chinh phục' },
                    ] as const
                  ).map((btn) => (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick(1.03);
                        setJourneyFilter(btn.id);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer font-mono-nums ${
                        journeyFilter === btn.id
                          ? 'bg-amber-400/15 border-amber-300 text-amber-200'
                          : 'bg-[#080d1e] border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredJourneyChapters.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-[#080d1c] p-6 text-center text-xs text-slate-400">
                  Không có chương nào khớp bộ lọc hiện tại. Tiếp tục vượt ải Hoàng Đạo để mở khóa mốc thưởng mới.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredJourneyChapters.map((ch) => (
                    <div
                      key={ch.chapterId}
                      className={`rounded-2xl border p-3.5 space-y-2.5 ${
                        ch.claimableCount > 0
                          ? 'bg-[#0d152e] border-amber-300/60'
                          : ch.bossCleared
                          ? 'bg-[#0c1329] border-emerald-400/30'
                          : 'bg-[#080d1c] border-slate-800/90'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-amber-300 font-mono-nums truncate">
                            Chương {ch.chapterId} · {ch.zodiacName} · {ch.eraTag}
                          </div>
                          <h3 className="font-display text-sm font-black text-white truncate mt-0.5">
                            {ch.realmTitle}
                          </h3>
                        </div>
                        <div className="text-[11px] font-bold font-mono-nums text-slate-300 shrink-0">
                          {ch.bossCleared ? (
                            <span className="text-emerald-300">★ {ch.starsEarned}/4</span>
                          ) : (
                            <span>Ải {ch.bestStage}/{ch.totalStages}</span>
                          )}
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-300 leading-relaxed">
                        <span className="font-bold text-sky-300">Cổ Vật {ch.relic.has3dStoryProp ? '3D' : 'Thánh Địa'}:</span>{' '}
                        <span className="text-white font-semibold">{ch.relic.relicName}</span>
                        {' — '}
                        {ch.relic.relicDesc}
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                        {ch.milestones.map((ms) => {
                          const rewardParts: string[] = [];
                          if (ms.def.rewardGold > 0) {
                            rewardParts.push(`${ms.def.rewardGold.toLocaleString('vi-VN')} Vàng`);
                          }
                          if (ms.def.rewardGems > 0) {
                            rewardParts.push(`${ms.def.rewardGems} Ngọc`);
                          }
                          if (ms.def.rewardStarDust > 0) {
                            rewardParts.push(`${ms.def.rewardStarDust} Bụi Sao`);
                          }
                          return (
                            <div
                              key={ms.def.id}
                              className="flex items-center justify-between gap-2 rounded-xl bg-[#060a18] border border-slate-800/80 px-2.5 py-2"
                            >
                              <div className="min-w-0">
                                <div className="text-[11px] font-bold text-slate-100 truncate">
                                  {ms.def.title}{' '}
                                  <span className="text-slate-400 font-mono-nums font-normal">
                                    · {ms.progressText}
                                  </span>
                                </div>
                                <div className="text-[10px] text-amber-200/90 font-mono-nums truncate">
                                  {rewardParts.join(' · ')}
                                </div>
                              </div>
                              {ms.status === 'claimed' ? (
                                <span className="text-[10px] font-bold text-emerald-300 shrink-0 inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Đã nhận
                                </span>
                              ) : ms.status === 'claimable' && onClaimJourneyMilestone ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    soundEngine.playLevelUp();
                                    onClaimJourneyMilestone(ms.def.id);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-black cursor-pointer shrink-0"
                                >
                                  Nhận Thưởng
                                </button>
                              ) : (
                                <span className="text-[10px] font-semibold text-slate-500 shrink-0">
                                  Chưa mở
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'synergies' ? (
            <div className="space-y-3">
              <div className="text-xs text-slate-300 leading-relaxed bg-[#0a1024] border border-amber-400/20 rounded-xl px-3.5 py-2.5">
                Chọn ít nhất 1 kỹ năng từ <strong className="text-amber-200">Nhánh A</strong> và 1 kỹ
                năng từ <strong className="text-sky-200">Nhánh B</strong> để mở Cộng Hưởng{' '}
                <strong className="text-emerald-300">Bậc I (×1.0)</strong>, cộng dồn đạt{' '}
                <strong className="text-amber-200">4 tầng → Bậc II (×1.35)</strong> và{' '}
                <strong className="text-amber-300">6+ tầng → Bậc III (×1.70)</strong>.
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
          ) : activeTab === 'evolutions' ? (
            <div className="space-y-3">
              <div className="text-xs text-slate-300 leading-relaxed bg-[#0a1024] border border-emerald-400/25 rounded-xl px-3.5 py-2.5">
                Khi nâng kỹ năng cốt lõi (Hỏa Tiễn, Băng Tiễn, Lôi Tiễn, Liên Xạ, Cầu Xoay, Phi Kiếm) đạt <strong className="text-amber-200">tầng 2+</strong> trong trận, bảng rút thẻ sẽ mở <strong className="text-emerald-300">Ngã Rẽ Tiến Hóa 2 Nhánh</strong> (Đánh Boss vs Diện Rộng).
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {evolutionEntries.map((evo) => (
                  <div
                    key={evo.id}
                    className={`rounded-2xl border p-3.5 ${
                      evo.discovered
                        ? 'bg-[#0c1329] border-emerald-400/40'
                        : 'bg-[#080d1c] border-slate-800/90'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-slate-400 truncate">
                          Gốc: <span className="text-amber-300">{evo.baseSkillName}</span> ·{' '}
                          <span style={{ color: evo.accentColor }}>
                            {evo.branch === 'boss' ? 'Nhánh Boss' : 'Nhánh AoE'}
                          </span>
                        </div>
                        <h3 className="font-display text-sm font-black text-white mt-0.5 truncate">
                          {evo.name}
                        </h3>
                      </div>
                      {evo.discovered ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <GitBranch className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                      )}
                    </div>
                    <p className="mt-2 text-xs text-slate-200 leading-relaxed">{evo.description}</p>
                    <div
                      className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] font-bold font-mono-nums"
                      style={{ color: evo.accentColor }}
                    >
                      {evo.effectSummary}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === 'bosses' ? (
            <div className="space-y-3">
              <div className="text-xs text-slate-300 leading-relaxed bg-[#0a1024] border border-rose-400/20 rounded-xl px-3.5 py-2.5">
                Hồ sơ chiến thuật &amp; biên niên sử Hoàng Đạo: Boss Ch.1–4 và Ch.10–12 sở hữu <strong className="text-rose-300">3 Pha chiến đấu</strong> kèm cửa sổ <strong className="text-sky-300">Ngắt Chiêu</strong> &amp; <strong className="text-emerald-300">Phản Đòn</strong>. Chinh phục đủ <strong className="text-amber-300">★1–★4</strong> để mở khóa trọn bộ sưu tập chương.
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
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <BossPortraitBadge
                          chapterId={boss.chapterId}
                          bossName={boss.bossName}
                          variant="portrait"
                          className="w-12 h-12 rounded-xl"
                        />
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-amber-300 font-mono-nums truncate">
                            Chương {boss.chapterId} · {boss.chapterName}
                          </div>
                          <h3 className="font-display text-sm font-black text-white truncate mt-0.5">
                            {boss.bossName}
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 mt-0.5 font-mono-nums text-[11px] font-bold text-amber-300">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>
                          {boss.starsEarned}/{boss.maxStars}
                        </span>
                      </div>
                    </div>

                    <div className="mt-1.5 text-[11px] font-semibold text-slate-400 font-mono-nums flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      <span>{boss.hasPhaseThree ? '3 Pha Chiến Đấu' : 'Pha II ≤50% HP'}</span>
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

                    {(() => {
                      const chapterLore = getZodiacChapterLore(boss.chapterId);
                      return (
                        <>
                          {chapterLore && (
                            <div className="mt-2 pt-2 border-t border-amber-400/15 space-y-1">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300/90 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                <span>{chapterLore.realmTitle}</span>
                                <span className="text-slate-600">·</span>
                                <span className="text-slate-300">{chapterLore.factionName}</span>
                                <span className="text-slate-600">·</span>
                                <span className="text-slate-400">{chapterLore.eraTag}</span>
                              </div>
                              <p className="text-[11px] text-slate-300 leading-relaxed">
                                {chapterLore.chronicle}
                              </p>
                            </div>
                          )}

                          <p className="mt-1.5 text-[11px] text-slate-300/95 italic leading-relaxed">
                            {chapterLore?.bossLore ?? boss.loreExcerpt}
                          </p>

                          <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1 text-[11px] text-slate-200 leading-snug">
                            {boss.phasesSummary.map((pLine, pIdx) => (
                              <div key={pIdx} className="text-slate-300">
                                • {pLine}
                              </div>
                            ))}
                          </div>

                          <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1 text-[11px] leading-relaxed">
                            <div className="text-sky-200">
                              <strong className="text-sky-300">Khắc chế &amp; Ngắt Chiêu:</strong>{' '}
                              {boss.interruptTip}
                            </div>
                            {chapterLore && (
                              <div className="text-emerald-200/95">
                                <strong className="text-emerald-300">Mẹo Địa Hình:</strong>{' '}
                                {chapterLore.tacticalTip}
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Personal Career Records Grid */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-300">
                  <Trophy className="w-4 h-4 shrink-0" />
                  <span>Kỷ Lục Sự Nghiệp Hoàng Đạo</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      label: 'Chương Cao Nhất',
                      value: `Ch.${personalRecords.highestChapterCleared}`,
                      accent: 'text-amber-300',
                    },
                    {
                      label: 'Tháp Vô Tận',
                      value: `Tầng ${personalRecords.bestTowerFloor}`,
                      accent: 'text-sky-300',
                    },
                    {
                      label: 'Combo Đỉnh Cao',
                      value: `${personalRecords.maxComboEver.toLocaleString('vi-VN')}×`,
                      accent: 'text-emerald-300',
                    },
                    {
                      label: 'Tổng Mục Tiêu Hạ',
                      value: personalRecords.totalKills.toLocaleString('vi-VN'),
                      accent: 'text-white',
                    },
                    {
                      label: 'Đại Boss Đã Hạ',
                      value: personalRecords.totalBossesKilled.toLocaleString('vi-VN'),
                      accent: 'text-rose-300',
                    },
                    {
                      label: 'Tổng Trận & Rương',
                      value: `${personalRecords.totalRuns} · ${personalRecords.totalChestsOpened}`,
                      accent: 'text-purple-300',
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl bg-[#0a1024] border border-amber-400/20 px-3.5 py-2.5"
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {stat.label}
                      </div>
                      <div className={`font-mono-nums text-base sm:text-lg font-black mt-0.5 ${stat.accent}`}>
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4-Reaction Elemental Matrix */}
              <div className="space-y-2.5 pt-2 border-t border-amber-400/15">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-sky-300">
                    <Zap className="w-4 h-4 shrink-0" />
                    <span>Ma Trận 6 Phản Ứng Nguyên Tố 3D &amp; Chuỗi Cộng Hưởng</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Đủ 6 cặp nguyên tố · Nối 2 phản ứng khác nhau trong 6s kích hoạt +18% ST
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {EXTENDED_ELEMENTAL_REACTION_GUIDE.map((rx) => (
                    <div
                      key={rx.id}
                      className="rounded-2xl bg-[#0c1329] border border-slate-800/90 p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-xs shrink-0"
                            style={{ backgroundColor: rx.accentColor }}
                          />
                          <h3 className="font-display text-sm font-black text-white truncate">
                            {rx.name}
                          </h3>
                        </div>
                        <span className="text-[11px] font-black text-amber-200 font-mono-nums shrink-0">
                          {rx.formula}
                        </span>
                      </div>

                      <div className="text-[11px] font-bold text-slate-300 font-mono-nums flex items-center gap-2">
                        <span style={{ color: rx.accentColor }}>{rx.bonusPctLabel}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-cyan-300">Phá Giáp Boss +{rx.breakShredPct}%</span>
                      </div>

                      <p className="text-xs text-slate-200 leading-relaxed border-t border-slate-800/80 pt-2">
                        {rx.tacticalUse}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
