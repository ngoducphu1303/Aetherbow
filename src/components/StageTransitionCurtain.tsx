import React from 'react';
import { Compass, Crown, Flame, Gem, Moon, Shield, Skull, Snowflake, Sparkles, Swords, Trophy, Users, Zap } from 'lucide-react';
import { CHAPTERS } from '../data/chaptersData';
import { COOP_DIFFICULTY_MAP, ELEMENTAL_TOWER_MAP } from '../data/wave6Data';
import { CoopRaidDifficulty, ElementalTowerId } from '../types/game';

interface StageTransitionCurtainProps {
  chapterId: number;
  isTowerMode?: boolean;
  isBossRushMode?: boolean;
  isDailyRiftMode?: boolean;
  isGuildBossMode?: boolean;
  isArenaMode?: boolean;
  isCoopRaidMode?: boolean;
  coopDifficulty?: CoopRaidDifficulty;
  isElementalTowerMode?: boolean;
  elementalTowerId?: ElementalTowerId;
  isCrystalDefenseMode?: boolean;
  isWorldBossMode?: boolean;
  isBloodMoonMode?: boolean;
  isAbyssalMode?: boolean;
  isGuildWarMode?: boolean;
  isPantheonMode?: boolean;
  isChampionshipMode?: boolean;
  isCrystalVaultMode?: boolean;
  isDragonLairMode?: boolean;
  arenaOpponentName?: string;
  dailyRiftTitle?: string;
}

export const StageTransitionCurtain: React.FC<StageTransitionCurtainProps> = ({
  chapterId,
  isTowerMode = false,
  isBossRushMode = false,
  isDailyRiftMode = false,
  isGuildBossMode = false,
  isArenaMode = false,
  isCoopRaidMode = false,
  coopDifficulty = 'normal',
  isElementalTowerMode = false,
  elementalTowerId = 'fire',
  isCrystalDefenseMode = false,
  isWorldBossMode = false,
  isBloodMoonMode = false,
  isAbyssalMode = false,
  isGuildWarMode = false,
  isPantheonMode = false,
  isChampionshipMode = false,
  isCrystalVaultMode = false,
  isDragonLairMode = false,
  arenaOpponentName,
  dailyRiftTitle,
}) => {
  const ch = CHAPTERS.find((c) => c.id === chapterId) ?? CHAPTERS[0];
  const elTower = ELEMENTAL_TOWER_MAP[elementalTowerId];
  const coopDef = COOP_DIFFICULTY_MAP[coopDifficulty];

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-[#040611]/95 a2-curtain">
      <div className="text-center px-6 py-8 max-w-md w-full">
        <div className="flex justify-center mb-3 text-4xl sm:text-5xl text-amber-300">
          {isDragonLairMode ? (
            <Flame className="w-12 h-12 text-rose-400" />
          ) : isCrystalVaultMode ? (
            <Gem className="w-12 h-12 text-yellow-300" />
          ) : isChampionshipMode ? (
            <Trophy className="w-12 h-12 text-amber-300" />
          ) : isArenaMode ? (
            <Swords className="w-12 h-12 text-rose-400" />
          ) : isPantheonMode ? (
            <Crown className="w-12 h-12 text-amber-300" />
          ) : isGuildWarMode ? (
            <Shield className="w-12 h-12 text-emerald-300" />
          ) : isAbyssalMode ? (
            <Sparkles className="w-12 h-12 text-purple-300" />
          ) : isBloodMoonMode ? (
            <Moon className="w-12 h-12 text-rose-400" />
          ) : isCrystalDefenseMode ? (
            <Gem className="w-12 h-12 text-cyan-300" />
          ) : isWorldBossMode ? (
            <Trophy className="w-12 h-12 text-amber-300" />
          ) : isCoopRaidMode ? (
            <Users className="w-12 h-12 text-sky-300" />
          ) : isElementalTowerMode ? (
            elementalTowerId === 'fire' ? (
              <Flame className="w-12 h-12 text-orange-400" />
            ) : elementalTowerId === 'ice' ? (
              <Snowflake className="w-12 h-12 text-sky-300" />
            ) : (
              <Zap className="w-12 h-12 text-purple-300" />
            )
          ) : isGuildBossMode ? (
            <Skull className="w-12 h-12 text-amber-300" />
          ) : isDailyRiftMode ? (
            <Sparkles className="w-12 h-12 text-purple-300" />
          ) : isBossRushMode ? (
            <Skull className="w-12 h-12 text-rose-400" />
          ) : isTowerMode ? (
            <Compass className="w-12 h-12 text-purple-300" />
          ) : (
            ch.zodiacIcon
          )}
        </div>
        <div className="text-xs font-extrabold uppercase tracking-[0.24em] text-amber-300 mb-1.5">
          {isDragonLairMode
            ? 'Phó Bản Đồ Long 3D · 75 Giây · 3 Pha Cuồng Nộ'
            : isCrystalVaultMode
            ? 'Hầm Mỏ Kho Báu Hoàng Kim 3D · 60 Giây'
            : isChampionshipMode
            ? 'Giải Đấu Quán Quân 3D · 3 Hiệp Chọn Chiến Thuật'
            : isArenaMode
            ? 'Đấu Trường Xếp Hạng 1v1 · 45 Giây'
            : isPantheonMode
            ? 'Viễn Chinh Điện Thần 3D · 3 Tầng Thần Chủ'
            : isGuildWarMode
            ? 'Chiến Trường Bang Hội 3D · 75 Giây'
            : isAbyssalMode
            ? 'Hố Sâu Đột Biến · 10 Đợt Khắc Nghiệt'
            : isBloodMoonMode
            ? 'Sinh Tồn Nhật Thực · 90 Giây'
            : isCrystalDefenseMode
            ? 'Thánh Địa Pha Lê · 6 Đợt Công Thành'
            : isWorldBossMode
            ? 'Boss Thế Giới Liên Server · 60 Giây'
            : isCoopRaidMode
            ? `Phó Bản Hợp Tác 3 Anh Hùng · ${coopDef.badge}`
            : isElementalTowerMode
            ? `Tháp Thí Luyện · ${elTower.badge}`
            : isGuildBossMode
            ? 'Thánh Điện Bang Hội Hoàng Đạo · 60 Giây'
            : isDailyRiftMode
            ? 'Bí Cảnh Biến Hóa · 3 Ải Hoàng Đạo'
            : isBossRushMode
            ? 'Đấu Trường Nhật Thực · 5 Vòng'
            : isTowerMode
            ? 'Tháp Vô Tận · Hoàng Đạo Tinh Giới'
            : `Chương ${ch.id} · ${ch.zodiacName}`}
        </div>
        <h2 className="font-display text-2xl sm:text-3xl font-black text-white mb-2">
          {isDragonLairMode
            ? 'Lãnh Địa Rồng Cổ Tinh Giới 3D'
            : isCrystalVaultMode
            ? 'Khai Phá Hầm Mỏ Pha Lê 3D'
            : isChampionshipMode
            ? 'Đấu Trường Cúp Vinh Quang 3 Hiệp'
            : isArenaMode
            ? `VS · ${arenaOpponentName || 'Kình Địch'}`
            : isPantheonMode
            ? 'Viễn Chinh Điện Thần Hoàng Đạo'
            : isGuildWarMode
            ? 'Chiến Trường Bang Hội 3D'
            : isAbyssalMode
            ? 'Hố Sâu Đột Biến 3D'
            : isBloodMoonMode
            ? 'Đêm Trăng Máu Sinh Tồn 3D'
            : isCrystalDefenseMode
            ? 'Thủ Thành Pha Lê Tinh Linh 3D'
            : isWorldBossMode
            ? 'Hắc Long Tinh Giới Liên Server'
            : isCoopRaidMode
            ? coopDef.name
            : isElementalTowerMode
            ? elTower.name
            : isGuildBossMode
            ? 'Boss Bang Hội · Ma Long'
            : isDailyRiftMode
            ? dailyRiftTitle || 'Bí Cảnh Hằng Ngày'
            : isBossRushMode
            ? 'Săn Boss Liên Hoàn'
            : isTowerMode
            ? 'Tầng 1 · Khởi Hành Leo Tháp'
            : ch.name}
        </h2>
        <div className="cel-divider-gold max-w-[180px] mx-auto my-2.5" />
        <div className="text-xs text-slate-300 font-semibold">
          {isDragonLairMode
            ? 'Chạm trán Cổ Long 3D qua 3 pha cuồng nộ! Quan sát vùng đỏ Hơi Thở Rồng để lướt né và thu hoạch Vảy Rồng Cổ, Cỏ Tinh Tú & Linh Ngọc!'
            : isCrystalVaultMode
            ? 'Phá hủy liên tiếp các Trụ Pha Lê Vàng & Hộ Vệ Kho Báu trong 60 giây để thu hoạch Ngọc Hồn, Đá Đúc Hoàng Kim & Mảnh Thần Binh!'
            : isChampionshipMode
            ? 'Đánh bại liên tiếp 3 Anh Hùng Quán Quân 3D · Chọn 1 trong 3 Thẻ Chiến Thuật giữa mỗi hiệp để rinh Cúp Vinh Quang & Lõi Thần Sủng!'
            : isArenaMode
            ? 'Hạ gục đối thủ hoặc giữ % Sinh Lực cao hơn khi hết 45 giây để thăng hạng!'
            : isPantheonMode
            ? 'Đánh bại liên tiếp 3 Thần Chủ Điện Thần dưới sức mạnh Chúc Phúc để săn Thần Tinh nâng Hào Quang 3D!'
            : isGuildWarMode
            ? 'Chiếm giữ 3 Trụ Tinh Thể và tiêu diệt Hộ Vệ Chiến Trường trong 75 giây để tích Điểm Bang!'
            : isAbyssalMode
            ? 'Vượt 10 đợt quái đột biến tăng tiến cực hạn để thu thập Mảnh Thánh Khí & Ấn Thần Bí!'
            : isBloodMoonMode
            ? 'Hạ gục các đợt quái Huyết Nguyệt trong 90 giây để tích Huyết Tinh, săn Mảnh Thú Cưỡi & Tinh Thể!'
            : isCrystalDefenseMode
            ? 'Đứng chắn trước Pha Lê Tinh Linh ở trung tâm, ngăn quái vật phá hủy qua 6 đợt để nhận Lông Vũ!'
            : isWorldBossMode
            ? 'Gây tối đa sát thương trong 60 giây để leo Bảng Xếp Hạng Liên Server & mở mốc thưởng!'
            : isCoopRaidMode
            ? '2 Đồng Hành AI 3D sẽ tự động tấn công, né đạn & tung Tuyệt Kỹ cùng bạn!'
            : isElementalTowerMode
            ? elTower.ruleDesc
            : isGuildBossMode
            ? 'Gây tối đa sát thương trong 60 giây để mở rương hạng D → SS cho toàn Bang'
            : isDailyRiftMode
            ? 'Săn Bụi Tinh Tú & Tinh Chất Tinh Linh theo quy tắc biến hóa hôm nay'
            : isBossRushMode
            ? 'Đối đầu liên tiếp Thủ Lĩnh Hoàng Đạo · Thu hoạch Ngọc Hồn cực lớn'
            : isTowerMode
            ? 'Xoay vòng 12 Tinh Giới · Boss xuất hiện mỗi 3 tầng'
            : `Đang mở cổng Thánh Điện · Thủ lĩnh: ${ch.bossName}`}
        </div>
      </div>
    </div>
  );
};
