import React, { useState } from 'react';
import { ChevronRight, Compass, Flame, Shield, Sparkles, Swords, X } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface OnboardingTourProps {
  onComplete: () => void;
  onJumpToTab?: (tab: 'battle' | 'gear' | 'heroes' | 'runes' | 'shop') => void;
}

const STEPS = [
  {
    title: 'Chào Mừng Đến Hoàng Đạo Tinh Giới',
    subtitle: 'Bước 1 / 4 · Làm Quen Sảnh Thánh Điện',
    desc: 'Nhấn vào chân dung Anh Hùng ở góc trên trái để xem Hồ Sơ, bảng Chỉ Số chi tiết và Thành Tựu. Bạn có thể xoay nhân vật 3D trực tiếp giữa sảnh.',
    tip: 'Mở nút Sự Kiện ở góc trên phải để nhận Quà Tân Thủ, Điểm Danh 7 Ngày và thưởng Battle Pass!',
    icon: <Sparkles className="w-6 h-6 text-amber-300" />,
    tabAction: null as null | 'gear' | 'shop',
    tabLabel: '',
  },
  {
    title: 'Trang Bị, Ngọc Khắc & Rương x10',
    subtitle: 'Bước 2 / 4 · Gia Tăng Lực Chiến',
    desc: 'Trang bị 6 món đồ và khảm tối đa 4 Ngọc Khắc Cổ Đại trong khi ngắm trực tiếp Anh Hùng 3D. Ghé Kho Báu để mở Rương x10 kèm bảo hiểm đồ [S] Thần Thoại.',
    tip: 'Ghép 3 trang bị giống nhau để thăng bậc Hiếm → Sử Thi → Huyền Thoại!',
    icon: <Shield className="w-6 h-6 text-emerald-300" />,
    tabAction: 'gear' as const,
    tabLabel: 'Xem Kho Trang Bị',
  },
  {
    title: 'Chế Độ Chiến Đấu & Sức Mạnh Vĩnh Viễn',
    subtitle: 'Bước 3 / 4 · 12 Chương & Phụ Bản 3D',
    desc: 'Nhấn nút Chế Độ ở góc trên phải để chọn Chiến Dịch 12 Chương, Tháp Vô Tận, Săn Boss, Đấu Trường hay Điện Thần 3D. Dùng Vàng nâng Thiên Phú vĩnh viễn.',
    tip: 'Mỗi Chương hoàn thành mở khóa thêm phụ bản 3D mới và tăng thưởng rớt đồ hiếm.',
    icon: <Compass className="w-6 h-6 text-purple-300" />,
    tabAction: null,
    tabLabel: '',
  },
  {
    title: 'Sẵn Sàng Xuất Trận 3D',
    subtitle: 'Bước 4 / 4 · Điều Khiển Chiến Đấu',
    desc: 'Dùng WASD hoặc kéo màn hình để né đòn — dừng lại Anh Hùng sẽ tự động bắn. Canh né sát đòn địch để kích hoạt Né Hoàn Hảo!',
    tip: 'SPACE: Lướt né bất tử ngắn · E: Kỹ Năng Chủ Động · Q: Tung Tuyệt Kỹ khi đủ 100% Nộ!',
    icon: <Flame className="w-6 h-6 text-rose-300" />,
    tabAction: null,
    tabLabel: '',
  },
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  onComplete,
  onJumpToTab,
}) => {
  const [stepIdx, setStepIdx] = useState(0);
  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-[#040611]/78">
      <div className="cel-panel-ornate w-full max-w-md rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-300/60 flex items-center justify-center shrink-0">
              {step.icon}
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                {step.subtitle}
              </div>
              <h3 className="font-display text-base sm:text-lg font-black text-white mt-0.5">
                {step.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(0.9);
              onComplete();
            }}
            aria-label="Bỏ qua hướng dẫn"
            className="cel-panel w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">{step.desc}</p>

        <div className="rounded-xl bg-[#070b1a] border border-amber-400/25 px-3.5 py-2.5 text-xs text-amber-200 font-semibold">
          {step.tip}
        </div>

        {/* Step Progress Dots (Static, no pulsing) */}
        <div className="flex items-center justify-center gap-2 pt-1">
          {STEPS.map((s, i) => (
            <span
              key={s.title}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIdx ? 'w-7 bg-amber-300' : 'w-2 bg-slate-700'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(0.9);
              onComplete();
            }}
            className="a2-slate-btn px-4 py-2.5 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap"
          >
            Bỏ Qua
          </button>

          {step.tabAction && onJumpToTab && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onJumpToTab(step.tabAction!);
                onComplete();
              }}
              className="a2-emerald-btn px-3.5 py-2.5 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap"
            >
              {step.tabLabel}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(1.1);
              if (isLast) {
                onComplete();
              } else {
                setStepIdx((v) => v + 1);
              }
            }}
            className="a2-yellow-btn flex-1 py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            {isLast ? <Swords className="w-4 h-4" /> : null}
            <span>{isLast ? 'Bắt Đầu Chinh Phục' : 'Bước Tiếp Theo'}</span>
            {!isLast && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
