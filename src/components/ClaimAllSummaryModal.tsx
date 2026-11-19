import React from 'react';
import { CheckCircle2, Gift, Sparkles, X } from 'lucide-react';
import { previewLobbyClaimAll } from '../data/wave12Data';
import { SaveData } from '../types/game';

interface ClaimAllSummaryModalProps {
  save: SaveData;
  onClose: () => void;
  onClaimAll: () => void;
}

export const ClaimAllSummaryModal: React.FC<ClaimAllSummaryModalProps> = ({
  save,
  onClose,
  onClaimAll,
}) => {
  const preview = previewLobbyClaimAll(save);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-4 bg-[#040611]/92 overflow-y-auto">
      <div className="cel-panel-ornate w-full max-w-lg rounded-3xl overflow-hidden my-auto max-h-[90vh] flex flex-col a2-modal-enter">
        <div className="px-5 py-4 bg-[#080d22] border-b border-amber-400/35 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 text-slate-950 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
                Đặc Quyền Tiện Lợi · 1 Chạm Thu Hoạch
              </div>
              <h2 className="font-display text-base sm:text-lg font-black text-white truncate">
                Nhận Nhanh Toàn Bộ Quà Sảnh ({preview.totalClaimableCount})
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-300 text-slate-200 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3 bg-[#050816]">
          {preview.sources.length === 0 ? (
            <div className="rounded-2xl bg-[#090f24] border border-slate-800 p-6 text-center">
              <CheckCircle2 className="w-9 h-9 text-emerald-400 mx-auto mb-2" />
              <div className="font-display text-sm font-black text-white">
                Bạn Đã Nhận Hết Quà Đang Chờ!
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Hãy tham gia Hầm Mỏ Pha Lê 3D, Giải Đấu Quán Quân hoặc Vòng Quay Kho Báu để mở thêm
                nhiều mốc thưởng mới.
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-300">
                Toàn bộ phần thưởng từ Thẻ Tháng, Hòm Thư, Sổ Tay, Lễ Hội, Cúp Giải Đấu, Hầm Mỏ Pha
                Lê và Quỹ Hoàn Ngọc sẽ được thu thập cùng lúc:
              </p>
              <div className="space-y-2">
                {preview.sources.map((src) => (
                  <div
                    key={src.id}
                    className="rounded-xl bg-[#090f24] border border-amber-400/30 px-3.5 py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-display text-xs sm:text-sm font-black text-amber-200 truncate">
                        {src.label}
                      </div>
                      <div className="text-[11px] text-slate-300 truncate">{src.detail}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/50 font-mono-nums text-xs font-black text-emerald-300 shrink-0">
                      +{src.count}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-3.5 bg-[#080d22] border-t border-slate-800 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="a2-slate-btn px-4 py-2.5 rounded-xl font-black text-xs whitespace-nowrap cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={preview.totalClaimableCount <= 0}
            onClick={() => {
              onClaimAll();
              onClose();
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 whitespace-nowrap ${
              preview.totalClaimableCount > 0
                ? 'a2-yellow-btn cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Nhận Tất Cả Quà Ngay ({preview.totalClaimableCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
