import React from 'react';
import { Compass, Skull, Sparkles, Swords } from 'lucide-react';
import { CHAPTERS } from '../data/chaptersData';

interface StageTransitionCurtainProps {
  chapterId: number;
  isTowerMode?: boolean;
  isBossRushMode?: boolean;
  isDailyRiftMode?: boolean;
  isGuildBossMode?: boolean;
  isArenaMode?: boolean;
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
  arenaOpponentName,
  dailyRiftTitle,
}) => {
  const ch = CHAPTERS.find((c) => c.id === chapterId) ?? CHAPTERS[0];

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-[#040611]/95 a2-curtain">
      <div className="text-center px-6 py-8 max-w-md w-full">
        <div className="flex justify-center mb-3 text-4xl sm:text-5xl text-amber-300">
          {isArenaMode ? (
            <Swords className="w-12 h-12 text-rose-400" />
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
          {isArenaMode
            ? 'Đấu Trường Xếp Hạng 1v1 · 45 Giây'
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
          {isArenaMode
            ? `VS · ${arenaOpponentName || 'Kình Địch'}`
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
          {isArenaMode
            ? 'Hạ gục đối thủ hoặc giữ % Sinh Lực cao hơn khi hết 45 giây để thăng hạng!'
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

