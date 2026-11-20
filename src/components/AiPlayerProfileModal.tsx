import React from 'react';
import {
  Award,
  Crown,
  Feather,
  Flame,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { HERO_MAP } from '../data/heroesData';
import type { AiLivePlayerProfile } from '../types/game';

interface AiPlayerProfileModalProps {
  player: AiLivePlayerProfile | null;
  isPinnedForCoop?: boolean;
  onChallengeDuel: (aiPlayerId: string) => void;
  onTogglePinCoop: (aiPlayerId: string) => void;
  onClose: () => void;
}

const PERSONALITY_META: Record<
  AiLivePlayerProfile['personality'],
  { label: string; colorClass: string; desc: string }
> = {
  aggressive: {
    label: 'Xung Phong Tốc Chiến',
    colorClass: 'text-rose-300',
    desc: 'Áp sát liên hoàn, dồn sát thương chủ động và kết liễu nhanh.',
  },
  tactical: {
    label: 'Chiến Thuật Toàn Diện',
    colorClass: 'text-emerald-300',
    desc: 'Giữ cự ly chuẩn, né đòn Boss tinh tế và phối hợp Tuyệt Kỹ theo nhịp.',
  },
  assassin: {
    label: 'Sát Thủ Chí Mạng',
    colorClass: 'text-amber-300',
    desc: 'Tụ lực đón góc, bùng nổ chí mạng vào khoảnh khắc sơ hở.',
  },
};

export const AiPlayerProfileModal: React.FC<AiPlayerProfileModalProps> = ({
  player,
  isPinnedForCoop = false,
  onChallengeDuel,
  onTogglePinCoop,
  onClose,
}) => {
  if (!player) return null;

  const hero = HERO_MAP[player.heroId] ?? HERO_MAP.artemis;
  const personality = PERSONALITY_META[player.personality] ?? PERSONALITY_META.tactical;
  const build = player.buildSnapshot ?? {
    weaponName: 'Cung Ánh Trăng Thần Thoại',
    armorName: 'Áo Giáp Tinh Giới',
    mountName: 'Bạch Hổ Tinh Linh',
    wingName: 'Cánh Thiên Quang',
    favoriteSkills: ['Đa Tiễn', 'Tăng Tốc Bắn', 'Chí Mạng'],
    tacticSummary: personality.desc,
  };

  const totalDuels = player.duelWins + player.duelLosses;
  const winRate = totalDuels > 0 ? Math.round((player.duelWins / totalDuels) * 100) : 50;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#040611]/90 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cel-panel-ornate w-full max-w-2xl rounded-3xl p-5 sm:p-6 my-auto text-left space-y-5 bg-[#070d20] border border-amber-400/35">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-amber-400/20">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold text-sky-300">
              <span className="size-2 rounded-full bg-emerald-400 shrink-0" />
              <span>Hồ Sơ Chiến Binh [AI Live]</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className={personality.colorClass}>{personality.label}</span>
            </div>
            <h2 className="font-display text-2xl font-black text-white mt-1 truncate">
              {player.displayName}
            </h2>
            <div className="text-xs text-slate-300 mt-0.5 flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-amber-200">{hero.name}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>{player.guildRole}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-emerald-300">{player.statusDetail}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hồ sơ chiến binh"
            className="a2-slate-btn p-2 rounded-xl cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Multi-BXH Combat Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-3 border-b border-amber-400/15">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Lực Chiến Tổng
            </div>
            <div className="font-mono-nums tabular-nums text-base font-black text-amber-300 mt-0.5">
              {player.powerRating.toLocaleString('vi-VN')}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Điểm Arena · Tỷ Lệ Thắng
            </div>
            <div className="font-mono-nums tabular-nums text-base font-black text-sky-300 mt-0.5">
              {player.duelRating.toLocaleString('vi-VN')} · {winRate}%
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Tháp Vô Tận · Boss Tuần
            </div>
            <div className="font-mono-nums tabular-nums text-base font-black text-emerald-300 mt-0.5">
              T.{player.bestTowerFloor} · {player.weeklyPracticeBest.toLocaleString('vi-VN')}đ
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Boss Thế Giới
            </div>
            <div className="font-mono-nums tabular-nums text-sm font-black text-white mt-0.5">
              {player.worldBossBestDamage.toLocaleString('vi-VN')} ST
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Boss Bang Hội
            </div>
            <div className="font-mono-nums tabular-nums text-sm font-black text-white mt-0.5">
              {player.guildBossDamage.toLocaleString('vi-VN')} ST
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Thành Tích Đấu 1v1
            </div>
            <div className="font-mono-nums tabular-nums text-sm font-black text-amber-200 mt-0.5">
              {player.duelWins} Thắng · {player.duelLosses} Thua
            </div>
          </div>
        </div>

        {/* Equipped Build Snapshot */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-200 flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-amber-300 shrink-0" />
              <span>Bộ Trang Bị &amp; Phong Cách Chiến Đấu</span>
            </h3>
            <span className="text-[11px] font-bold text-purple-300">{player.titleBadge}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="rounded-xl bg-[#0b132b] border border-amber-400/20 px-3.5 py-2.5 flex items-center gap-2.5">
              <Swords className="w-4 h-4 text-amber-300 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 font-bold">Vũ Khí Chủ Lực</div>
                <div className="font-bold text-white truncate">{build.weaponName}</div>
              </div>
            </div>
            <div className="rounded-xl bg-[#0b132b] border border-sky-400/20 px-3.5 py-2.5 flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-sky-300 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 font-bold">Áo Giáp Tinh Giới</div>
                <div className="font-bold text-white truncate">{build.armorName}</div>
              </div>
            </div>
            <div className="rounded-xl bg-[#0b132b] border border-emerald-400/20 px-3.5 py-2.5 flex items-center gap-2.5">
              <Flame className="w-4 h-4 text-emerald-300 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 font-bold">Thú Cưỡi Đồng Hành</div>
                <div className="font-bold text-white truncate">{build.mountName}</div>
              </div>
            </div>
            <div className="rounded-xl bg-[#0b132b] border border-purple-400/20 px-3.5 py-2.5 flex items-center gap-2.5">
              <Feather className="w-4 h-4 text-purple-300 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 font-bold">Đôi Cánh Huyền Thoại</div>
                <div className="font-bold text-white truncate">{build.wingName}</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-[#060a18] border border-slate-800 px-3.5 py-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Kỹ Năng Ưa Chuộng: {build.favoriteSkills.join(' · ')}</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">{build.tacticSummary}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-amber-400/15 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              onChallengeDuel(player.id);
              onClose();
            }}
            className="a2-yellow-btn py-3 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Swords className="w-4 h-4 shrink-0" />
            <span>Thách Đấu 1v1 Ngay</span>
          </button>

          <button
            type="button"
            onClick={() => onTogglePinCoop(player.id)}
            className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap transition-colors ${
              isPinnedForCoop
                ? 'a2-emerald-btn'
                : 'a2-slate-btn border border-sky-400/45 text-sky-200 hover:bg-sky-500/15'
            }`}
          >
            {isPinnedForCoop ? (
              <>
                <Award className="w-4 h-4 shrink-0" />
                <span>Đã Chọn Đồng Đội Co-op</span>
              </>
            ) : (
              <>
                <Users className="w-4 h-4 shrink-0" />
                <span>Chọn Làm Đồng Đội Co-op</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>Chọn đồng đội sẽ ưu tiên ghép chiến binh này khi vào Phó Bản Co-op 3D.</span>
          </span>
        </div>
      </div>
    </div>
  );
};
