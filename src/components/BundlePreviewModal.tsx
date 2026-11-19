import React from 'react';
import { Check, Gem, Gift, ShieldCheck, Sparkles, X } from 'lucide-react';
import { BundlePreviewItem, BundlePreviewPayload } from '../types/game';

interface BundlePreviewModalProps {
  payload: BundlePreviewPayload | null;
  gems: number;
  onClose: () => void;
  onConfirm?: () => void;
}

type PreviewRarity = BundlePreviewItem['rarity'];

const RARITY_STYLES: Record<
  PreviewRarity,
  { border: string; bg: string; label: string; text: string; icon: string }
> = {
  common: {
    border: 'border-slate-500/40',
    bg: 'bg-slate-800/70',
    label: 'Thường',
    text: 'text-slate-200',
    icon: '🪙',
  },
  rare: {
    border: 'border-sky-400/50',
    bg: 'bg-sky-950/60',
    label: 'Hiếm',
    text: 'text-sky-200',
    icon: '💎',
  },
  epic: {
    border: 'border-fuchsia-400/60',
    bg: 'bg-fuchsia-950/60',
    label: 'Sử Thi',
    text: 'text-fuchsia-200',
    icon: '🔮',
  },
  legendary: {
    border: 'border-amber-400/70',
    bg: 'bg-amber-950/60',
    label: 'Huyền Thoại',
    text: 'text-amber-200',
    icon: '✨',
  },
  mythic: {
    border: 'border-rose-400/75',
    bg: 'bg-gradient-to-br from-amber-950/70 via-rose-950/60 to-purple-950/70',
    label: 'Thần Thoại',
    text: 'text-amber-200',
    icon: '👑',
  },
};

export const BundlePreviewModal: React.FC<BundlePreviewModalProps> = ({
  payload,
  gems,
  onClose,
  onConfirm,
}) => {
  if (!payload) return null;

  const isDisabled = !payload.canAfford || Boolean(payload.disabledReason);
  const confirmAction = onConfirm ?? payload.onConfirm;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#040610]/85 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-amber-400/45 bg-gradient-to-b from-[#131932] via-[#0c1022] to-[#080b18] text-slate-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative border-b border-amber-400/20 bg-gradient-to-r from-amber-500/18 via-indigo-900/35 to-fuchsia-600/15 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng xem trước"
            className="absolute right-3.5 top-3.5 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-600/50 bg-slate-900/90 text-slate-300 transition hover:border-amber-400/60 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-wrap items-center gap-2 pr-8">
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/50 bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-200">
              <Sparkles className="h-3 w-3" />
              {payload.badge}
            </span>
            {payload.valueTag && (
              <span className="rounded-md bg-rose-600 px-2 py-0.5 text-[11px] font-black text-white">
                {payload.valueTag}
              </span>
            )}
            {payload.originalPriceLabel && (
              <span className="font-mono-nums text-[11px] text-slate-400 line-through">
                {payload.originalPriceLabel}
              </span>
            )}
          </div>

          <h3 className="mt-2 font-display text-xl font-black tracking-tight text-amber-100">
            {payload.title}
          </h3>
          <p className="mt-0.5 text-xs text-slate-300">{payload.subtitle}</p>
        </div>

        {/* Body */}
        <div className="max-h-[65vh] overflow-y-auto px-5 py-4 space-y-4">
          {/* Guaranteed / Included Items Grid */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300">
                <Gift className="h-3.5 w-3.5" />
                Vật Phẩm Chi Tiết Trong Gói ({payload.items.length})
              </span>
              <span className="text-[11px] text-slate-400">Nhận ngay vào túi đồ</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {payload.items.map((item, idx) => {
                const st = RARITY_STYLES[item.rarity] ?? RARITY_STYLES.common;
                return (
                  <div
                    key={`${item.label}-${idx}`}
                    className={`flex items-center gap-3 rounded-xl border ${st.border} ${st.bg} px-3 py-2.5`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-slate-950/60 text-lg">
                      {st.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-bold text-white">{item.label}</span>
                        <span className={`font-mono-nums shrink-0 text-xs font-black ${st.text}`}>
                          {item.quantity}
                        </span>
                      </div>
                      <span className={`text-[10px] font-semibold uppercase tracking-wide ${st.text}`}>
                        {item.note || st.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Transparent Drop Odds Table for Mystery Boxes */}
          {payload.dropOdds && payload.dropOdds.length > 0 && (
            <div className="rounded-xl border border-indigo-400/30 bg-indigo-950/40 p-3.5">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Tỷ Lệ Rơi Công Khai (Minh Bạch 100%)
                </span>
                <span className="text-[11px] text-slate-400">Mỗi lần mở nhận 1 mốc</span>
              </div>
              <div className="space-y-2">
                {payload.dropOdds.map((row, idx) => {
                  const st = RARITY_STYLES[row.rarity] ?? RARITY_STYLES.rare;
                  return (
                    <div key={`${row.label}-${idx}`} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className={`font-semibold ${st.text}`}>{row.label}</span>
                        <span className="font-mono-nums font-black text-white">{row.chancePct}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-900">
                        <div
                          className={`h-full rounded-full ${
                            row.rarity === 'mythic'
                              ? 'bg-gradient-to-r from-rose-400 via-amber-300 to-yellow-200'
                              : row.rarity === 'legendary'
                              ? 'bg-gradient-to-r from-amber-400 to-yellow-300'
                              : row.rarity === 'epic'
                              ? 'bg-gradient-to-r from-fuchsia-500 to-pink-400'
                              : 'bg-gradient-to-r from-sky-500 to-cyan-300'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(6, row.chancePct))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-700/60 bg-[#070a15] px-5 py-3.5">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Gem className="h-4 w-4 text-sky-400" />
            <span>Hiện có:</span>
            <span className="font-mono-nums font-black text-sky-200">
              {gems.toLocaleString('vi-VN')} Ngọc Hồn
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="whitespace-nowrap rounded-xl border border-slate-600/60 bg-slate-800/80 px-4 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-700 cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              disabled={isDisabled}
              onClick={() => {
                if (isDisabled) return;
                confirmAction();
                onClose();
              }}
              className={`whitespace-nowrap inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-black uppercase tracking-wide shadow-lg transition ${
                isDisabled
                  ? 'cursor-not-allowed border border-slate-700 bg-slate-800 text-slate-500'
                  : 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 hover:brightness-110 active:scale-[0.98] cursor-pointer'
              }`}
            >
              {payload.disabledReason ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  {payload.disabledReason}
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  {payload.confirmLabel}
                  {payload.priceLabel && (
                    <span className="font-mono-nums ml-1 rounded bg-slate-950/20 px-1.5 py-0.5 text-[11px]">
                      {payload.priceLabel}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
