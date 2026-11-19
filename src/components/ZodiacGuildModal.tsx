import React, { useState } from 'react';
import { Building2, Check, Crown, Flame, Gift, Shield, Skull, Sparkles, Swords, Trophy, Users, X } from 'lucide-react';
import guildSanctuaryArt from '../assets/images/guild_zodiac_sanctuary_1794982055649.jpg';
import guildWarCitadelArt from '../assets/images/guild_war_citadel_1795010358440.jpg';
import guildCitadelBossArt from '../assets/images/guild_citadel_boss_1795058109598.jpg';
import { soundEngine } from '../audio/soundEngine';
import {
  GUILD_BOSS_DAMAGE_TIERS,
  GUILD_RIVAL_MEMBERS,
  GUILD_TECH_DEFS,
  MAX_DAILY_GUILD_BOSS_RUNS,
  MAX_DAILY_GUILD_TRIBUTES,
  getGuildBossRankTier,
  getGuildLevelExpReq,
  normalizeGuild,
} from '../data/wave4Data';
import {
  GUILD_WAR_MAX_DAILY_RUNS,
  GUILD_WAR_WEEKLY_BOXES,
  normalizeGuildWar,
} from '../data/wave9Data';
import {
  GUILD_DAILY_BOSS_CHESTS,
  GUILD_MONUMENT_DEFS,
  computeGuildSanctuaryBonuses,
  countClaimableGuildSanctuaryRewards,
  getGuildMonumentUpgradeCost,
  normalizeGuildSanctuary,
} from '../data/wave14Data';
import { HERO_MAP } from '../data/heroesData';
import { GuildMonumentId, GuildTechId, SaveData } from '../types/game';
import { ArtifactRelicIcon, GoldCoinIcon, MysticTokenIcon, SoulGemIcon, StarDustIcon } from './GameIcons';

interface ZodiacGuildModalProps {
  save: SaveData;
  powerRating: number;
  onTribute: (currency: 'gold' | 'gems') => void;
  onUpgradeTech: (techId: GuildTechId) => void;
  onClaimDamageTier: (tierId: string) => void;
  onStartGuildBoss: () => void;
  onStartGuildWar?: () => void;
  onClaimGuildWarBox?: (score: number) => void;
  onUpgradeMonument?: (monumentId: GuildMonumentId) => void;
  onClaimDailySanctuaryBlessing?: () => void;
  onClaimDailyGuildBossChest?: (chestId: string) => void;
  onClose: () => void;
}

export const ZodiacGuildModal: React.FC<ZodiacGuildModalProps> = ({
  save,
  powerRating,
  onTribute,
  onUpgradeTech,
  onClaimDamageTier,
  onStartGuildBoss,
  onStartGuildWar,
  onClaimGuildWarBox,
  onUpgradeMonument,
  onClaimDailySanctuaryBlessing,
  onClaimDailyGuildBossChest,
  onClose,
}) => {
  const [subTab, setSubTab] = useState<'boss' | 'sanctuary' | 'war' | 'tech' | 'members'>('boss');
  const [imgErr, setImgErr] = useState(false);
  const [warImgErr, setWarImgErr] = useState(false);
  const [sanctuaryImgErr, setSanctuaryImgErr] = useState(false);

  const guild = normalizeGuild(save.guild);
  const gw = normalizeGuildWar(save.guildWar);
  const sanctuary = normalizeGuildSanctuary(save.guildSanctuary);
  const sanctuaryBonus = computeGuildSanctuaryBonuses(sanctuary);
  const sanctuaryClaimable = countClaimableGuildSanctuaryRewards(save);
  const expReq = getGuildLevelExpReq(guild.level);
  const expPct = Math.min(100, Math.round((guild.exp / Math.max(1, expReq)) * 100));
  const tributesLeft = Math.max(0, MAX_DAILY_GUILD_TRIBUTES - guild.tributeCountToday);
  const activeHero = HERO_MAP[save.selectedHeroId] ?? HERO_MAP.artemis;
  const rankTier = getGuildBossRankTier(guild.bestGuildBossDamage);

  const memberBoard = [
    ...GUILD_RIVAL_MEMBERS.map((m) => ({ ...m, isPlayer: false })),
    {
      name: `${activeHero.name} (Bạn)`,
      role: 'Tinh Vệ',
      contribution: guild.tributeCountToday * 120 + guild.guildCoins * 10,
      bossDmg: guild.bestGuildBossDamage,
      isPlayer: true,
    },
  ].sort((a, b) => b.bossDmg - a.bossDmg);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5 bg-[#040611]/90 overflow-y-auto">
      <div className="cel-panel-ornate w-full max-w-4xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh] a2-modal-enter">
        {/* Top Sanctuary Art Header */}
        <div className="relative shrink-0 border-b border-amber-400/25 bg-[#070b1a]">
          {!imgErr && (
            <img
              src={guildSanctuaryArt}
              alt="Thánh Điện Bang Hội Hoàng Đạo"
              referrerPolicy="no-referrer"
              onError={() => setImgErr(true)}
              className="w-full h-36 sm:h-44 object-cover opacity-55"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070b1a] via-[#070b1a]/70 to-[#070b1a]/45" />

          <div className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-300/70 flex items-center justify-center text-2xl shrink-0 shadow-lg">
                  {guild.emblem}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[11px] font-black text-amber-300 uppercase tracking-wider">
                    <span>Bang Hội Cấp {guild.level}</span>
                    <span aria-hidden="true">·</span>
                    <span>LC {powerRating.toLocaleString('vi-VN')}</span>
                  </div>
                  <h2 className="font-display text-lg sm:text-2xl font-black text-white truncate">
                    {guild.name}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="px-3 py-1.5 rounded-xl bg-[#070b1a]/95 border border-amber-400/45 flex items-center gap-1.5 text-xs font-mono-nums font-black text-amber-300">
                  <Crown className="w-3.5 h-3.5 shrink-0" />
                  <span>{guild.guildCoins} Xu Bang</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick(0.9);
                    onClose();
                  }}
                  aria-label="Đóng Bang Hội"
                  className="a2-slate-btn w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex-1 min-w-[210px] max-w-sm">
                <div className="flex items-center justify-between text-[10px] font-mono-nums font-bold text-slate-200 mb-1">
                  <span>Kinh Nghiệm Bang Hội</span>
                  <span>
                    {guild.exp}/{expReq} ({expPct}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-950/90 border border-amber-400/30 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-300"
                    style={{ width: `${expPct}%` }}
                  />
                </div>
              </div>

              {/* Daily Guild Tribute Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-300">
                  Cống Hiến ({tributesLeft}/{MAX_DAILY_GUILD_TRIBUTES}):
                </span>
                <button
                  type="button"
                  disabled={tributesLeft <= 0 || save.gold < 150}
                  onClick={() => {
                    soundEngine.playLevelUp();
                    onTribute('gold');
                  }}
                  className="a2-yellow-btn px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <GoldCoinIcon className="w-3.5 h-3.5" />
                  <span>150 → +30 Xu</span>
                </button>
                <button
                  type="button"
                  disabled={tributesLeft <= 0 || save.gems < 20}
                  onClick={() => {
                    soundEngine.playVictory();
                    onTribute('gems');
                  }}
                  className="a2-purple-btn px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <SoulGemIcon className="w-3.5 h-3.5" />
                  <span>20 → +75 Xu</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="px-4 sm:px-6 pt-3 pb-2 bg-[#060916] border-b border-amber-400/20 grid grid-cols-2 sm:grid-cols-5 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setSubTab('boss');
            }}
            className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === 'boss' ? 'a2-yellow-btn' : 'a2-slate-btn text-slate-300'
            }`}
          >
            <Skull className="w-4 h-4 shrink-0" />
            <span>Boss ({guild.bossRunsRemaining}/{MAX_DAILY_GUILD_BOSS_RUNS})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setSubTab('sanctuary');
            }}
            className={`relative py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === 'sanctuary' ? 'a2-yellow-btn' : 'a2-slate-btn text-slate-300'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span>Lãnh Địa 3D</span>
            {sanctuaryClaimable > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-mono-nums leading-none">
                {sanctuaryClaimable}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setSubTab('war');
            }}
            className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === 'war' ? 'a2-emerald-btn' : 'a2-slate-btn text-slate-300'
            }`}
          >
            <Swords className="w-4 h-4 shrink-0" />
            <span>Chiến Trường ({gw.dailyRunsRemaining}/{GUILD_WAR_MAX_DAILY_RUNS})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setSubTab('tech');
            }}
            className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === 'tech' ? 'a2-emerald-btn' : 'a2-slate-btn text-slate-300'
            }`}
          >
            <Shield className="w-4 h-4 shrink-0" />
            <span>Khoa Kỹ</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setSubTab('members');
            }}
            className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === 'members' ? 'a2-purple-btn' : 'a2-slate-btn text-slate-300'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Thành Viên ({memberBoard.length})</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto a2-scroll p-4 sm:p-6">
          {subTab === 'boss' && (
            <div className="space-y-4">
              <div className="cel-panel rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-rose-400/40">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-black text-rose-300 uppercase tracking-wider">
                    <Flame className="w-3.5 h-3.5" />
                    <span>Thử Thách 60 Giây · Thái Cổ Ma Long Hoàng Đạo</span>
                  </div>
                  <h3 className="font-display text-base sm:text-lg font-black text-white mt-0.5">
                    Trận Săn Boss Bang Hội (Hạng Hiện Tại: {rankTier.rank} · {rankTier.label})
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Xả toàn bộ sát thương lên Ma Long trong 60 giây để lập kỷ lục và mở khóa Rương Mốc D → SS nhận Xu Bang, Bụi Tinh Tú &amp; Ngọc Hồn!
                  </p>
                  <div className="flex flex-wrap gap-4 mt-2.5 text-xs font-mono-nums">
                    <span className="text-amber-300 font-black">
                      Kỷ Lục Cao Nhất: {guild.bestGuildBossDamage.toLocaleString('vi-VN')} ST
                    </span>
                    <span className="text-sky-300 font-bold">
                      Tổng Tích Lũy: {guild.totalGuildBossDamage.toLocaleString('vi-VN')} ST
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={guild.bossRunsRemaining <= 0}
                  onClick={() => {
                    soundEngine.playUiClick(1.1);
                    onStartGuildBoss();
                  }}
                  className="a2-yellow-btn py-3 px-5 rounded-xl font-display font-black text-sm flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Swords className="w-4 h-4" />
                  <span>
                    {guild.bossRunsRemaining > 0
                      ? `KHIÊU CHIẾN (${guild.bossRunsRemaining}/${MAX_DAILY_GUILD_BOSS_RUNS})`
                      : 'Hết Lượt Hôm Nay'}
                  </span>
                </button>
              </div>

              <div>
                <h4 className="font-display text-xs font-black uppercase tracking-wider text-amber-200 mb-2.5">
                  Rương Mốc Sát Thương Boss Bang Hội
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {GUILD_BOSS_DAMAGE_TIERS.map((tier) => {
                    const reached = guild.bestGuildBossDamage >= tier.minDamage;
                    const claimed = guild.claimedDamageTiers.includes(tier.id);
                    return (
                      <div
                        key={tier.id}
                        className={`rounded-2xl p-3.5 border flex flex-col justify-between gap-2.5 ${
                          claimed
                            ? 'bg-[#070b18]/75 border-slate-800'
                            : reached
                            ? 'cel-panel-ornate'
                            : 'cel-panel'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display text-sm font-black text-amber-300">
                              Hạng {tier.rank} · {tier.label}
                            </span>
                            <span className="font-mono-nums text-[11px] font-bold text-slate-300">
                              ≥ {tier.minDamage.toLocaleString('vi-VN')}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-mono-nums font-bold mt-2">
                            <span className="text-amber-300">+{tier.guildCoins} Xu</span>
                            <span className="flex items-center gap-1 text-sky-300">
                              <StarDustIcon className="w-3 h-3" />+{tier.starDust}
                            </span>
                            <span className="flex items-center gap-1 text-purple-300">
                              <SoulGemIcon className="w-3 h-3" />+{tier.gems}
                            </span>
                          </div>
                        </div>

                        {claimed ? (
                          <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Đã Nhận Mốc
                          </span>
                        ) : reached ? (
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playAchievement();
                              onClaimDamageTier(tier.id);
                            }}
                            className="a2-emerald-btn w-full py-2 rounded-xl text-xs font-black cursor-pointer"
                          >
                            Nhận Rương {tier.rank}
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-500">
                            Cần thêm {(tier.minDamage - guild.bestGuildBossDamage).toLocaleString('vi-VN')} ST
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {subTab === 'sanctuary' && (
            <div className="space-y-4">
              {/* Hero Banner for 3D Guild Sanctuary */}
              <div className="relative rounded-2xl overflow-hidden border border-amber-400/45 bg-[#080e20]">
                {!sanctuaryImgErr && (
                  <img
                    src={guildCitadelBossArt}
                    alt="Lãnh Địa Bang Hội 3D & Boss Hàng Ngày"
                    referrerPolicy="no-referrer"
                    onError={() => setSanctuaryImgErr(true)}
                    className="w-full h-36 sm:h-44 object-cover opacity-55"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-[#060916]/95 via-[#0b132b]/82 to-transparent" />
                <div className="relative z-[1] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                      Lãnh Địa Bang Hội 3D · Tổng Cấp Kiến Trúc {sanctuaryBonus.totalLevel}/40
                    </div>
                    <h3 className="font-display text-base sm:text-lg font-black text-white mt-0.5">
                      Xây Dựng Kỳ Quan &amp; Nhận Rương Boss Hàng Ngày
                    </h3>
                    <div className="flex flex-wrap gap-3 mt-2 text-[11px] font-mono-nums font-bold">
                      <span className="text-amber-300">+{Math.round(sanctuaryBonus.atkPct * 100)}% Công</span>
                      <span className="text-emerald-300">+{Math.round(sanctuaryBonus.hpPct * 100)}% Máu</span>
                      <span className="text-rose-300">+{Math.round(sanctuaryBonus.bossDmg * 100)}% ST Boss</span>
                      <span className="text-yellow-200">+{Math.round(sanctuaryBonus.goldPct * 100)}% Vàng</span>
                    </div>
                  </div>

                  {onClaimDailySanctuaryBlessing && (
                    <button
                      type="button"
                      disabled={sanctuary.dailySanctuaryBlessingClaimed}
                      onClick={() => {
                        soundEngine.playAchievement();
                        onClaimDailySanctuaryBlessing();
                      }}
                      className={`py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                        sanctuary.dailySanctuaryBlessingClaimed
                          ? 'bg-slate-900 border border-slate-700 text-emerald-400 cursor-default'
                          : 'a2-emerald-btn'
                      }`}
                    >
                      {sanctuary.dailySanctuaryBlessingClaimed ? (
                        <>
                          <Check className="w-4 h-4 shrink-0" />
                          <span>Đã Nhận Lộc Lãnh Địa</span>
                        </>
                      ) : (
                        <>
                          <Gift className="w-4 h-4 shrink-0" />
                          <span>Nhận Lộc Hàng Ngày (+55 Xu · +30 Ngọc)</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* 4 Upgradeable 3D Guild Monuments */}
              <div>
                <h4 className="font-display text-xs font-black uppercase tracking-wider text-amber-200 mb-2.5">
                  4 Công Trình Kiến Trúc Lãnh Địa 3D (Buff Vĩnh Viễn)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {GUILD_MONUMENT_DEFS.map((m) => {
                    const lv = sanctuary.monumentLevels[m.id] ?? 0;
                    const isMax = lv >= m.maxLevel;
                    const cost = getGuildMonumentUpgradeCost(lv, m);
                    const canAfford = !isMax && guild.guildCoins >= cost.guildCoins && save.gold >= cost.gold;

                    return (
                      <div key={m.id} className="cel-panel rounded-2xl p-4 flex flex-col justify-between gap-3">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <h5 className="font-display text-sm font-black text-white">{m.name}</h5>
                            <span className="font-mono-nums text-xs font-black text-amber-300">
                              Lv.{lv}/{m.maxLevel}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1">{m.subtitle}</p>
                          <div className="flex flex-wrap gap-2.5 mt-2 text-[11px] font-mono-nums font-bold text-emerald-300">
                            {m.atkPctPerLv > 0 && <span>+{Math.round(lv * m.atkPctPerLv * 100)}% Công</span>}
                            {m.hpPctPerLv > 0 && <span>+{Math.round(lv * m.hpPctPerLv * 100)}% Máu</span>}
                            {m.bossDmgPerLv > 0 && <span>+{Math.round(lv * m.bossDmgPerLv * 100)}% ST Boss</span>}
                            {m.goldPctPerLv > 0 && <span>+{Math.round(lv * m.goldPctPerLv * 100)}% Vàng</span>}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-amber-400/15">
                          <div className="flex items-center gap-3 text-xs font-mono-nums font-black">
                            <span className={guild.guildCoins >= cost.guildCoins ? 'text-amber-300' : 'text-rose-400'}>
                              {cost.guildCoins} Xu
                            </span>
                            <span className={`flex items-center gap-1 ${save.gold >= cost.gold ? 'text-amber-200' : 'text-rose-400'}`}>
                              <GoldCoinIcon className="w-3.5 h-3.5" />
                              {cost.gold}
                            </span>
                          </div>
                          {onUpgradeMonument && (
                            <button
                              type="button"
                              disabled={isMax || !canAfford}
                              onClick={() => {
                                soundEngine.playLevelUp();
                                onUpgradeMonument(m.id);
                              }}
                              className="a2-yellow-btn px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {isMax ? 'Tối Đa' : 'Nâng Kiến Trúc'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Daily Guild Boss Damage Chests */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <h4 className="font-display text-xs font-black uppercase tracking-wider text-rose-200">
                    Rương Sát Thương Boss Bang Hội Hôm Nay
                  </h4>
                  <span className="font-mono-nums text-xs font-black text-amber-300">
                    Tổng Sát Thương Hôm Nay: {sanctuary.dailyBossDamage.toLocaleString('vi-VN')} ST
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {GUILD_DAILY_BOSS_CHESTS.map((chest) => {
                    const reached = sanctuary.dailyBossDamage >= chest.damageTarget;
                    const claimed = sanctuary.claimedDailyBossChestIds.includes(chest.id);
                    return (
                      <div
                        key={chest.id}
                        className={`rounded-2xl p-3.5 border flex flex-col justify-between gap-2.5 ${
                          claimed
                            ? 'bg-[#070b18]/75 border-slate-800'
                            : reached
                            ? 'cel-panel-ornate'
                            : 'cel-panel'
                        }`}
                      >
                        <div>
                          <div className="font-display text-xs font-black text-amber-300">
                            {chest.title}
                          </div>
                          <div className="font-mono-nums text-[10px] font-bold text-slate-400 mt-0.5">
                            Mục tiêu ≥ {chest.damageTarget.toLocaleString('vi-VN')} ST
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2 text-[11px] font-mono-nums font-bold">
                            <span className="text-amber-300">+{chest.rewardGuildCoins} Xu</span>
                            <span className="text-purple-300">+{chest.rewardGems} Ngọc</span>
                            <span className="text-fuchsia-300">+{chest.rewardMythicShards} Mảnh</span>
                            <span className="text-sky-300">+{chest.rewardFeathers} Lông Vũ</span>
                          </div>
                        </div>

                        {claimed ? (
                          <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Đã Nhận Hôm Nay
                          </span>
                        ) : reached && onClaimDailyGuildBossChest ? (
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playAchievement();
                              onClaimDailyGuildBossChest(chest.id);
                            }}
                            className="a2-emerald-btn w-full py-2 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap"
                          >
                            Mở Rương Ngày
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playUiClick();
                              setSubTab('boss');
                            }}
                            className="a2-slate-btn w-full py-1.5 rounded-xl text-[11px] font-bold text-slate-300 cursor-pointer whitespace-nowrap"
                          >
                            Săn Boss Bang
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {subTab === 'war' && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden border border-emerald-400/45 bg-[#06111c]">
                {!warImgErr && (
                  <img
                    src={guildWarCitadelArt}
                    alt="Chiến Trường Bang Hội 3D"
                    referrerPolicy="no-referrer"
                    onError={() => setWarImgErr(true)}
                    className="w-full h-36 sm:h-44 object-cover opacity-50"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-[#060916]/95 via-[#071122]/85 to-transparent" />
                <div className="relative z-[1] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wider text-emerald-300">
                      Chiến Trường Bang Hội 3D · 75 Giây
                    </div>
                    <h3 className="font-display text-base sm:text-lg font-black text-white mt-0.5">
                      Chiếm 3 Trụ Tinh Thể &amp; Bảo Vệ Pháo Đài
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl">
                      Đứng gần 3 Trụ Tinh Thể để chiếm cứ điểm (+Điểm/s) và hạ gục Tướng Địch để tích Điểm Vinh Danh Tuần mở khóa Rương Thánh Khí!
                    </p>
                    <div className="flex flex-wrap gap-4 mt-2.5 text-xs font-mono-nums">
                      <span className="text-amber-300 font-black">
                        Điểm Tuần: {gw.weeklyScore.toLocaleString('vi-VN')}
                      </span>
                      <span className="text-emerald-300 font-bold">
                        Tổng Trụ Đã Chiếm: {gw.totalNodesCaptured}
                      </span>
                    </div>
                  </div>

                  {onStartGuildWar && (
                    <button
                      type="button"
                      disabled={gw.dailyRunsRemaining <= 0}
                      onClick={() => {
                        soundEngine.playUiClick(1.1);
                        onStartGuildWar();
                      }}
                      className="a2-emerald-btn py-3 px-5 rounded-xl font-display font-black text-sm flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Swords className="w-4 h-4" />
                      <span>
                        {gw.dailyRunsRemaining > 0
                          ? `XUẤT CHINH (${gw.dailyRunsRemaining}/${GUILD_WAR_MAX_DAILY_RUNS})`
                          : 'Hết Lượt Hôm Nay'}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-display text-xs font-black uppercase tracking-wider text-amber-200 mb-2.5">
                  Rương Vinh Danh Tuần Chiến Trường Bang
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {GUILD_WAR_WEEKLY_BOXES.map((box) => {
                    const reached = gw.weeklyScore >= box.score;
                    const claimed = gw.claimedWeeklyBoxes.includes(box.score);
                    return (
                      <div
                        key={box.score}
                        className={`rounded-2xl p-3.5 border flex flex-col justify-between gap-2.5 ${
                          claimed
                            ? 'bg-[#070b18]/75 border-slate-800'
                            : reached
                            ? 'cel-panel-ornate'
                            : 'cel-panel'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display text-sm font-black text-emerald-300">
                              {box.title}
                            </span>
                            <span className="font-mono-nums text-[11px] font-bold text-amber-300">
                              ≥ {box.score.toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-mono-nums font-bold mt-2">
                            <span className="flex items-center gap-1 text-purple-300">
                              <SoulGemIcon className="w-3 h-3" />+{box.rewardGems}
                            </span>
                            <span className="text-amber-300">+{box.rewardGuildCoins} Xu</span>
                            <span className="flex items-center gap-1 text-amber-200">
                              <ArtifactRelicIcon className="w-3 h-3" />+{box.rewardArtifactShards}
                            </span>
                            <span className="flex items-center gap-1 text-cyan-300">
                              <MysticTokenIcon className="w-3 h-3" />+{box.rewardMysticTokens}
                            </span>
                          </div>
                        </div>

                        {claimed ? (
                          <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Đã Nhận Tuần Này
                          </span>
                        ) : reached && onClaimGuildWarBox ? (
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playAchievement();
                              onClaimGuildWarBox(box.score);
                            }}
                            className="a2-emerald-btn w-full py-2 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap"
                          >
                            Nhận Quà Vinh Danh
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-500">
                            Cần thêm {(box.score - gw.weeklyScore).toLocaleString('vi-VN')} điểm
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {subTab === 'tech' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {GUILD_TECH_DEFS.map((tech) => {
                const lv = guild.techLevels[tech.id] ?? 0;
                const isMax = lv >= tech.maxLevel;
                const coinCost = tech.baseCoinCost + lv * tech.stepCoinCost;
                const goldCost = tech.baseGoldCost + lv * tech.stepGoldCost;
                const canAfford = !isMax && guild.guildCoins >= coinCost && save.gold >= goldCost;

                return (
                  <div
                    key={tech.id}
                    className="cel-panel rounded-2xl p-4 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-display text-sm font-black text-white">
                          {tech.name}
                        </h4>
                        <span className="font-mono-nums text-xs font-black text-amber-300">
                          Lv.{lv}/{tech.maxLevel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{tech.desc}</p>
                      <div className="text-[11px] font-bold text-emerald-300 mt-2 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>{tech.perLevelLabel}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-amber-400/15">
                      <div className="flex items-center gap-3 text-xs font-mono-nums font-black">
                        <span className={guild.guildCoins >= coinCost ? 'text-amber-300' : 'text-rose-400'}>
                          {coinCost} Xu
                        </span>
                        <span className={`flex items-center gap-1 ${save.gold >= goldCost ? 'text-amber-200' : 'text-rose-400'}`}>
                          <GoldCoinIcon className="w-3.5 h-3.5" />
                          {goldCost}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={isMax || !canAfford}
                        onClick={() => {
                          soundEngine.playLevelUp();
                          onUpgradeTech(tech.id);
                        }}
                        className="a2-emerald-btn px-4 py-2 rounded-xl text-xs font-black cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {isMax ? 'Tối Đa' : 'Nghiên Cứu'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {subTab === 'members' && (
            <div className="space-y-2.5">
              {memberBoard.map((m, idx) => (
                <div
                  key={m.name}
                  className={`rounded-2xl px-4 py-3 border flex items-center justify-between gap-3 ${
                    m.isPlayer
                      ? 'bg-amber-500/15 border-amber-300/70'
                      : 'cel-panel'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-xl font-mono-nums text-xs font-black flex items-center justify-center shrink-0 ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-950'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-950'
                          : idx === 2
                          ? 'bg-orange-400 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-display text-sm font-black text-white truncate">
                        {m.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-semibold">
                        {m.role} · Cống hiến {m.contribution.toLocaleString('vi-VN')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono-nums shrink-0">
                    <div className="text-[10px] text-slate-400">Kỷ Lục Boss Bang</div>
                    <div className="text-sm font-black text-amber-300 flex items-center justify-end gap-1">
                      <Trophy className="w-3.5 h-3.5" />
                      <span>{m.bossDmg.toLocaleString('vi-VN')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
