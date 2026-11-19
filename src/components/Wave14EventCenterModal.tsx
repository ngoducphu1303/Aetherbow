import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Crown,
  Dices,
  Feather,
  Flame,
  Gift,
  Shield,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import royalSeasonArt from '../assets/images/royal_season_treasury_1795058108382.jpg';
import { soundEngine } from '../audio/soundEngine';
import { countClaimableBattlePass } from '../data/liveOpsData';
import { countClaimableFestivalRewards } from '../data/wave11Data';
import { canClaimSupremeMonthlyDaily, previewLobbyClaimAll } from '../data/wave12Data';
import { countClaimableCarnivalRewards, countClaimableDragonLairMilestones } from '../data/wave13Data';
import {
  SEASON_IV_TITLE,
  countClaimableAstralBoardRewards,
  countClaimableGuildSanctuaryRewards,
  countClaimableSkyCitadelMilestones,
} from '../data/wave14Data';
import { SaveData } from '../types/game';

export type LiveEventActionTarget =
  | 'wave14_wings'
  | 'wave14_board'
  | 'wave14_relics'
  | 'battle_pass'
  | 'guild_sanctuary'
  | 'carnival_7day'
  | 'royal_vault'
  | 'festival'
  | 'treasure_wheel'
  | 'claim_all';

interface Wave14EventCenterModalProps {
  save: SaveData;
  onNavigate: (target: LiveEventActionTarget) => void;
  onClose: () => void;
}

function formatRemainingToMidnight(nowMs: number): string {
  const d = new Date(nowMs);
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0);
  const diffSec = Math.max(0, Math.floor((next.getTime() - nowMs) / 1000));
  const h = Math.floor(diffSec / 3600);
  const m = Math.floor((diffSec % 3600) / 60);
  const s = diffSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const Wave14EventCenterModal: React.FC<Wave14EventCenterModalProps> = ({
  save,
  onNavigate,
  onClose,
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [bannerErr, setBannerErr] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const claimAll = previewLobbyClaimAll(save);
  const countdownText = formatRemainingToMidnight(nowMs);

  const eventCards: Array<{
    id: string;
    target: LiveEventActionTarget;
    category: string;
    title: string;
    summary: string;
    timerLabel: string;
    claimable: number;
    ctaLabel: string;
    accentBorder: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'ev_wings_sky',
      target: 'wave14_wings',
      category: 'SỰ KIỆN MỚI WAVE 14',
      title: 'Cánh Thần Quang 3D & Không Chiến',
      summary: 'Chinh phục 3 đợt Không Chiến săn Lông Vũ đột phá Cánh 3D lên 5★.',
      timerLabel: `Làm mới lượt sau ${countdownText}`,
      claimable: countClaimableSkyCitadelMilestones(save),
      ctaLabel: 'Mở Cánh & Không Chiến',
      accentBorder: 'border-sky-400/50',
      icon: <Feather className="w-5 h-5 text-sky-300" />,
    },
    {
      id: 'ev_astral_board',
      target: 'wave14_board',
      category: 'GIẢI TRÍ THƯƠNG MẠI',
      title: 'Bàn Cờ Xúc Xắc Tinh Tú & Cổ Vật',
      summary: 'Tung Xúc Xắc Thường & Xúc Xắc Vàng chọn số 1–6 nhận Mảnh Thần & Cổ Vật.',
      timerLabel: `Quà xúc xắc ngày sau ${countdownText}`,
      claimable: countClaimableAstralBoardRewards(save),
      ctaLabel: 'Tung Xúc Xắc Ngay',
      accentBorder: 'border-violet-400/50',
      icon: <Dices className="w-5 h-5 text-violet-300" />,
    },
    {
      id: 'ev_season_iv',
      target: 'battle_pass',
      category: SEASON_IV_TITLE.toUpperCase(),
      title: 'Sổ Chiến Lệnh & Kho Đổi Mảnh Thần',
      summary: 'Tích XP mùa giải nhận Rương [S] và đổi Cánh Phượng Hoàng, Danh Hiệu 3D.',
      timerLabel: 'Đang mở suốt Mùa IV',
      claimable: countClaimableBattlePass(save),
      ctaLabel: 'Mở Chiến Lệnh IV',
      accentBorder: 'border-amber-400/60',
      icon: <Crown className="w-5 h-5 text-amber-300" />,
    },
    {
      id: 'ev_guild_sanctuary',
      target: 'guild_sanctuary',
      category: 'BANG HỘI 3D',
      title: 'Lãnh Địa Bang Hội & Boss Hàng Ngày',
      summary: 'Nâng cấp 4 công trình Lãnh Địa Bang và mở 4 rương sát thương Boss ngày.',
      timerLabel: `Rương Boss reset sau ${countdownText}`,
      claimable: countClaimableGuildSanctuaryRewards(save),
      ctaLabel: 'Vào Lãnh Địa Bang',
      accentBorder: 'border-rose-400/50',
      icon: <Shield className="w-5 h-5 text-rose-300" />,
    },
    {
      id: 'ev_carnival_7day',
      target: 'carnival_7day',
      category: 'ƯU ĐÃI TÂN THỦ & NẠP ĐẦU',
      title: 'Lộ Trình Quà 7 Ngày & Nạp Đầu 3 Mốc',
      summary: 'Hoàn thành mục tiêu 7 ngày nhận Thú Cưỡi 3D và gói Nạp Đầu giá trị x18.',
      timerLabel: 'Ưu đãi đặc quyền đang mở',
      claimable: countClaimableCarnivalRewards(save),
      ctaLabel: 'Xem Lộ Trình 7 Ngày',
      accentBorder: 'border-emerald-400/50',
      icon: <Calendar className="w-5 h-5 text-emerald-300" />,
    },
    {
      id: 'ev_royal_vault',
      target: 'royal_vault',
      category: 'PHIÊN ĐẤU GIÁ & HỘP MÙ',
      title: 'Sàn Đấu Giá Giảm Dần & Hộp Mù 9 Ô',
      summary: 'Canh giá rơi mỗi 15 giây tại Sàn Đấu Giá và mở Hộp Mù chắc chắn trúng Giải Đặc Biệt.',
      timerLabel: `Phiên mới sau ${countdownText}`,
      claimable: countClaimableDragonLairMilestones(save),
      ctaLabel: 'Vào Sàn Đấu Giá',
      accentBorder: 'border-fuchsia-400/50',
      icon: <Sparkles className="w-5 h-5 text-fuchsia-300" />,
    },
    {
      id: 'ev_festival',
      target: 'festival',
      category: 'LỄ HỘI TINH GIỚI',
      title: 'Lễ Hội Đèn Lồng & Đặc Quyền Cuối Tuần',
      summary: 'Thu thập Đèn Lồng đổi Hộp Quà Bí Ẩn giảm sâu và kích hoạt Thẻ Cuối Tuần.',
      timerLabel: `Đếm ngược lễ hội ${countdownText}`,
      claimable: countClaimableFestivalRewards(save),
      ctaLabel: 'Mở Lễ Hội',
      accentBorder: 'border-orange-400/50',
      icon: <Flame className="w-5 h-5 text-orange-300" />,
    },
    {
      id: 'ev_treasure_wheel',
      target: 'treasure_wheel',
      category: 'KHO BÁU HOÀNG ĐẠO',
      title: 'Vòng Quay Kho Báu & Thẻ Tháng Chí Tôn',
      summary: 'Bảo hiểm 10 lượt trúng Đại Jackpot Ngọc Hồn và nhận quà ngày Thẻ Tháng Chí Tôn.',
      timerLabel: `Quà Thẻ Tháng reset sau ${countdownText}`,
      claimable: canClaimSupremeMonthlyDaily(save) ? 1 : 0,
      ctaLabel: 'Mở Vòng Quay',
      accentBorder: 'border-yellow-400/50',
      icon: <Trophy className="w-5 h-5 text-yellow-300" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-[#040611]/92 overflow-y-auto">
      <div className="cel-panel-ornate w-full max-w-5xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh] a2-modal-enter">
        {/* Banner Header */}
        <div className="relative shrink-0 border-b border-amber-400/25 bg-[#070b1a]">
          {!bannerErr ? (
            <img
              src={royalSeasonArt}
              alt="Trung Tâm Sự Kiện Live Hoàng Đạo"
              referrerPolicy="no-referrer"
              onError={() => setBannerErr(true)}
              className="w-full h-36 sm:h-40 object-cover opacity-50"
            />
          ) : (
            <div className="w-full h-36 sm:h-40 bg-gradient-to-r from-[#0b1332] via-[#1c1a40] to-[#080d22]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070b1a] via-[#070b1a]/75 to-[#070b1a]/35" />

          <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold text-amber-300 tracking-wide">
                  Trung Tâm Sự Kiện Live · Đồng Bộ Đếm Ngược
                </div>
                <h2 className="font-display text-lg sm:text-2xl font-black text-white mt-0.5">
                  Lịch Trình Sự Kiện & Ưu Đãi Đang Mở
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick(0.9);
                  onClose();
                }}
                aria-label="Đóng Trung Tâm Sự Kiện"
                className="a2-slate-btn w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-slate-300 font-mono-nums">
                8 sự kiện đang hoạt động · Làm mới ngày sau <strong className="text-amber-300">{countdownText}</strong>
              </div>
              {claimAll.totalClaimableCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick(1.15);
                    onNavigate('claim_all');
                  }}
                  className="a2-emerald-btn px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer text-slate-950"
                >
                  <Gift className="w-4 h-4" />
                  <span>Nhận Nhanh {claimAll.totalClaimableCount} Quà Sảnh</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Event Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#070b1a]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {eventCards.map((ev) => (
              <div
                key={ev.id}
                className={`rounded-2xl p-4 border bg-[#0c132b] flex flex-col justify-between gap-3 ${ev.accentBorder}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#070b1a] border border-slate-700/80 flex items-center justify-center shrink-0">
                    {ev.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-slate-400 truncate">
                        {ev.category}
                      </span>
                      {ev.claimable > 0 && (
                        <span className="text-[11px] font-mono-nums font-black text-emerald-300 whitespace-nowrap">
                          {ev.claimable} quà chờ nhận
                        </span>
                      )}
                    </div>
                    <h3 className="font-display text-base font-black text-white mt-0.5 truncate">
                      {ev.title}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{ev.summary}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/90">
                  <span className="text-[11px] font-mono-nums text-slate-400 truncate">
                    {ev.timerLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick(1.05);
                      onNavigate(ev.target);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                  >
                    <span>{ev.ctaLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
