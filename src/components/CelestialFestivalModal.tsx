import React, { useState } from 'react';
import {
  CheckCircle2,
  Eye,
  Flame,
  Gem,
  Gift,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import festivalBannerImg from '../assets/images/celestial_festival_lanterns_1795051178335.jpg';
import {
  CELESTIAL_FESTIVAL_QUESTS,
  FESTIVAL_MILESTONES,
  FESTIVAL_MYSTERY_BOXES,
  getFestivalQuestProgress,
  normalizeFestivalState,
} from '../data/wave11Data';
import { BundlePreviewPayload, MysteryBoxTierId, SaveData } from '../types/game';

interface CelestialFestivalModalProps {
  open: boolean;
  save: SaveData;
  lastBoxReward: {
    boxName: string;
    tierLabel: string;
    isJackpot: boolean;
    summary: string;
  } | null;
  onClose: () => void;
  onClaimQuest: (questId: string) => void;
  onClaimMilestone: (lanternsTarget: number) => void;
  onOpenMysteryBox: (tierId: MysteryBoxTierId) => void;
  onPreviewMysteryBox: (payload: BundlePreviewPayload, onConfirm?: () => void) => void;
}

const BOX_ICON: Record<MysteryBoxTierId, string> = {
  nebula: '🌌',
  eclipse: '🌒',
  supreme: '👑',
};

const BOX_MIN_CORES: Record<MysteryBoxTierId, number> = {
  nebula: 3,
  eclipse: 6,
  supreme: 12,
};

export const CelestialFestivalModal: React.FC<CelestialFestivalModalProps> = ({
  open,
  save,
  lastBoxReward,
  onClose,
  onClaimQuest,
  onClaimMilestone,
  onOpenMysteryBox,
  onPreviewMysteryBox,
}) => {
  const [subTab, setSubTab] = useState<'boxes' | 'quests'>('boxes');
  const [imgFailed, setImgFailed] = useState(false);

  if (!open) return null;

  const fest = normalizeFestivalState(save.festivalState);
  const maxLanterns = FESTIVAL_MILESTONES[FESTIVAL_MILESTONES.length - 1]?.lanternsTarget ?? 260;
  const progressPct = Math.min(100, Math.round((fest.lanterns / maxLanterns) * 100));

  const claimableQuests = CELESTIAL_FESTIVAL_QUESTS.filter(
    (q) =>
      !fest.claimedQuestIds.includes(q.id) &&
      getFestivalQuestProgress(save, q.metric) >= q.target
  ).length;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#040610]/85 p-2.5 sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-amber-400/45 bg-[#0b1022] text-slate-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Hero Banner */}
        <div className="relative h-40 shrink-0 overflow-hidden border-b border-amber-400/30 bg-gradient-to-r from-[#1c1038] via-[#2b1448] to-[#121933] sm:h-44">
          {!imgFailed && (
            <img
              src={festivalBannerImg}
              alt="Lễ Hội Tinh Giới"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="h-full w-full object-cover object-center opacity-75"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b1022] via-[#0b1022]/55 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b1022]/90 via-[#0b1022]/45 to-transparent" />

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng Lễ Hội Tinh Giới"
            className="absolute right-3.5 top-3.5 z-10 flex h-9 w-9 items-center justify-center rounded-xl border border-amber-300/35 bg-[#090d1b]/90 text-slate-200 transition hover:border-amber-300 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-4 sm:px-6">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-md border border-amber-400/50 bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-amber-200">
                <Sparkles className="h-3.5 w-3.5" />
                Sự Kiện Đặc Biệt · Mùa Đèn Lồng Tinh Tú
              </div>
              <h2 className="mt-1 font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
                Lễ Hội Tinh Giới &amp; Hộp Quà Bí Ẩn
              </h2>
              <p className="text-xs text-amber-100/85">
                Tích lũy Đèn Lồng Tinh Tú nhận Lõi Thần Sủng miễn phí · Mở Hộp Bí Ẩn giảm sốc tới 80%
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="rounded-xl border border-amber-400/45 bg-[#0c1226]/95 px-3.5 py-2 text-right">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  Đèn Lồng Tinh Tú
                </div>
                <div className="font-mono-nums text-lg font-black text-amber-200">
                  🏮 {fest.lanterns}
                </div>
              </div>
              <div className="rounded-xl border border-sky-400/40 bg-[#0c1226]/95 px-3.5 py-2 text-right">
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-300">
                  Ngọc Hồn
                </div>
                <div className="font-mono-nums text-lg font-black text-sky-200">
                  💎 {save.gems.toLocaleString('vi-VN')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Milestone Track */}
        <div className="shrink-0 border-b border-slate-800 bg-[#0f152c] px-4 py-3 sm:px-6">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-bold text-amber-200">
              Mốc Thưởng Đèn Lồng Lễ Hội ({fest.lanterns}/{maxLanterns})
            </span>
            <span className="font-mono-nums text-[11px] text-slate-400">
              Đã mở {fest.totalBoxesOpened} hộp bí ẩn
            </span>
          </div>
          <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-900">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-rose-400 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {FESTIVAL_MILESTONES.map((m) => {
              const claimed = fest.claimedMilestones.includes(m.lanternsTarget);
              const unlocked = fest.lanterns >= m.lanternsTarget;
              return (
                <div
                  key={m.lanternsTarget}
                  className={`flex flex-col justify-between rounded-xl border p-2.5 ${
                    claimed
                      ? 'border-emerald-500/35 bg-emerald-950/25'
                      : unlocked
                      ? 'border-amber-400/70 bg-amber-950/35'
                      : 'border-slate-700/60 bg-slate-900/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono-nums text-[11px] font-black text-amber-300">
                      🏮 {m.lanternsTarget}
                    </span>
                    <span className="truncate text-[10px] font-bold text-slate-300">{m.title}</span>
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-slate-100">
                    +{m.rewardGems}💎 · +{m.rewardSpiritCores} Lõi · +{m.rewardWishTickets} Vé
                  </div>
                  <button
                    type="button"
                    disabled={claimed || !unlocked}
                    onClick={() => onClaimMilestone(m.lanternsTarget)}
                    className={`mt-2 w-full whitespace-nowrap rounded-lg py-1 text-[11px] font-black uppercase transition ${
                      claimed
                        ? 'bg-emerald-900/40 text-emerald-300'
                        : unlocked
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 hover:brightness-110 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {claimed ? 'Đã Nhận ✓' : unlocked ? 'Nhận Mốc' : 'Chưa Đủ'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sub-tab switch */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-800 bg-[#090d1b] px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSubTab('boxes')}
              className={`whitespace-nowrap inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition cursor-pointer ${
                subTab === 'boxes'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950'
                  : 'border border-slate-700 bg-slate-900 text-slate-300 hover:border-amber-400/40'
              }`}
            >
              <Gift className="h-3.5 w-3.5" />
              Hộp Quà Bí Ẩn (-80%)
            </button>
            <button
              type="button"
              onClick={() => setSubTab('quests')}
              className={`whitespace-nowrap inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition cursor-pointer ${
                subTab === 'quests'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950'
                  : 'border border-slate-700 bg-slate-900 text-slate-300 hover:border-amber-400/40'
              }`}
            >
              <Trophy className="h-3.5 w-3.5" />
              Nhiệm Vụ Đèn Lồng
              {claimableQuests > 0 && (
                <span className="font-mono-nums rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-black text-white">
                  {claimableQuests}
                </span>
              )}
            </button>
          </div>
          <span className="hidden text-[11px] text-slate-400 sm:inline">
            Mở hộp bí ẩn cũng cộng Đèn Lồng &amp; Lõi Thần Sủng
          </span>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {lastBoxReward && (
            <div
              className={`mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 ${
                lastBoxReward.isJackpot
                  ? 'border-amber-300/80 bg-gradient-to-r from-amber-500/25 via-yellow-500/15 to-fuchsia-600/20'
                  : 'border-sky-400/45 bg-sky-950/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{lastBoxReward.isJackpot ? '👑' : '🎁'}</span>
                <div>
                  <div className="text-xs font-black uppercase tracking-wide text-amber-200">
                    {lastBoxReward.isJackpot ? 'NỔ HŨ ĐẠI THƯỞNG · ' : 'Mở Thành Công · '}
                    {lastBoxReward.boxName}
                  </div>
                  <div className="text-xs font-semibold text-white">
                    {lastBoxReward.tierLabel}: {lastBoxReward.summary}
                  </div>
                </div>
              </div>
            </div>
          )}

          {subTab === 'boxes' ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {FESTIVAL_MYSTERY_BOXES.map((box) => {
                const boughtCount = fest.mysteryBoxPurchases[box.id] ?? 0;
                const remaining = Math.max(0, box.maxWeeklyPurchases - boughtCount);
                const canAfford = remaining > 0 && save.gems >= box.costGems;
                const isSupreme = box.id === 'supreme';
                const jackpotDrop = box.drops[box.drops.length - 1];

                return (
                  <div
                    key={box.id}
                    className={`flex flex-col justify-between rounded-2xl border p-4 ${
                      isSupreme
                        ? 'border-amber-400/75 bg-gradient-to-b from-amber-950/45 via-[#15132b] to-[#0c1022]'
                        : 'border-indigo-400/35 bg-gradient-to-b from-indigo-950/40 to-[#0d1226]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-md bg-rose-600 px-2 py-0.5 text-[11px] font-black text-white">
                          {box.discountLabel}
                        </span>
                        <span className="font-mono-nums text-[10px] font-bold text-slate-300">
                          Còn {remaining}/{box.maxWeeklyPurchases} tuần
                        </span>
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-400/40 bg-slate-950/70 text-2xl">
                          {BOX_ICON[box.id]}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-display text-base font-black text-white">
                              {box.name}
                            </h4>
                            {isSupreme && <Flame className="h-3.5 w-3.5 text-amber-300 shrink-0" />}
                          </div>
                          <p className="text-[10px] font-bold text-amber-300">{box.badge}</p>
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/55 p-2.5 text-[11px] text-slate-200 space-y-1">
                        <div className="font-bold text-amber-300">Chắc chắn nhận:</div>
                        <div>• {box.guaranteedSummary}</div>
                        {jackpotDrop && (
                          <div className="text-sky-300">
                            • Nổ Hũ {jackpotDrop.chancePct}%: {jackpotDrop.label}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="font-mono-nums text-xs text-slate-400 line-through">
                          {box.originalGems} 💎
                        </span>
                        <span className="font-mono-nums inline-flex items-center gap-1 text-lg font-black text-amber-300">
                          <Gem className="h-4 w-4 text-sky-400" />
                          {box.costGems}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            onPreviewMysteryBox(
                              {
                                id: `box_${box.id}`,
                                title: box.name,
                                subtitle: box.guaranteedSummary,
                                badge: box.badge,
                                valueTag: box.discountLabel,
                                priceLabel: `${box.costGems} Ngọc`,
                                originalPriceLabel: `${box.originalGems} Ngọc`,
                                canAfford,
                                disabledReason:
                                  remaining <= 0
                                    ? 'Đã hết lượt mua tuần này'
                                    : save.gems < box.costGems
                                    ? 'Không đủ Ngọc Hồn'
                                    : undefined,
                                confirmLabel: 'Mở Hộp Ngay',
                                items: [
                                  {
                                    label: 'Đèn Lồng Tinh Tú',
                                    quantity: `+${box.lanternsBonus}`,
                                    rarity: 'rare',
                                  },
                                  {
                                    label: 'Lõi Thần Sủng (Chắc chắn)',
                                    quantity: `+${BOX_MIN_CORES[box.id]}`,
                                    rarity: 'epic',
                                  },
                                  {
                                    label: 'Cơ Hội Nổ Hũ Đại Thưởng',
                                    quantity: `${jackpotDrop?.chancePct ?? 10}%`,
                                    rarity: 'mythic',
                                    note: jackpotDrop?.label,
                                  },
                                ],
                                dropOdds: box.drops,
                                onConfirm: () => onOpenMysteryBox(box.id),
                              },
                              () => onOpenMysteryBox(box.id)
                            )
                          }
                          className="whitespace-nowrap inline-flex items-center justify-center gap-1 rounded-xl border border-slate-600/70 bg-slate-800/90 px-2.5 py-2 text-[11px] font-bold text-slate-200 transition hover:border-sky-400/60 hover:text-white cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Xem Tỷ Lệ
                        </button>
                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => onOpenMysteryBox(box.id)}
                          className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black uppercase transition ${
                            canAfford
                              ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 hover:brightness-110 cursor-pointer'
                              : 'cursor-not-allowed bg-slate-800 text-slate-500'
                          }`}
                        >
                          {remaining <= 0 ? 'Hết Lượt' : 'Mở Hộp'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2.5">
              {CELESTIAL_FESTIVAL_QUESTS.map((q) => {
                const progress = Math.min(q.target, getFestivalQuestProgress(save, q.metric));
                const done = progress >= q.target;
                const claimed = fest.claimedQuestIds.includes(q.id);
                const pct = Math.min(100, Math.round((progress / q.target) * 100));
                return (
                  <div
                    key={q.id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 ${
                      claimed
                        ? 'border-emerald-500/30 bg-emerald-950/20'
                        : done
                        ? 'border-amber-400/60 bg-amber-950/30'
                        : 'border-slate-700/60 bg-slate-900/70'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">{q.title}</span>
                        <span className="font-mono-nums text-[11px] font-bold text-amber-300">
                          ({progress}/{q.target})
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{q.desc}</p>
                      <div className="mt-2 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-slate-950">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right text-[11px] font-bold">
                        <div className="text-amber-300">+{q.rewardLanterns} 🏮 Đèn Lồng</div>
                        <div className="text-sky-300">
                          +{q.rewardGems}💎 · +{q.rewardGold}🪙
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={claimed || !done}
                        onClick={() => onClaimQuest(q.id)}
                        className={`whitespace-nowrap inline-flex items-center gap-1 rounded-xl px-4 py-2 text-xs font-black uppercase transition ${
                          claimed
                            ? 'bg-emerald-900/40 text-emerald-300'
                            : done
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 hover:brightness-110 cursor-pointer'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {claimed ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Đã Nhận
                          </>
                        ) : done ? (
                          'Nhận Ngay'
                        ) : (
                          'Đang Làm'
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
