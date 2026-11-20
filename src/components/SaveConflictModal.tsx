import React from 'react';
import { Cloud, HardDrive, ShieldAlert } from 'lucide-react';
import { SaveConflictSnapshot } from '../services/playerCloudService';

interface SaveConflictModalProps {
  conflict: SaveConflictSnapshot;
  busy: boolean;
  onChooseCloud: () => void;
  onChooseLocal: () => void;
}

function formatSyncTime(ms: number): string {
  try {
    return new Date(ms).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  } catch {
    return 'Gần đây';
  }
}

export const SaveConflictModal: React.FC<SaveConflictModalProps> = ({
  conflict,
  busy,
  onChooseCloud,
  onChooseLocal,
}) => {
  const { cloudRecord, localSave, localPower } = conflict;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#040611]/94 p-4">
      <div className="cel-panel-ornate w-full max-w-xl rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-400/15 border border-amber-300/45 flex items-center justify-center text-amber-300 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-black text-white">
              Chọn Dữ Liệu Đồng Bộ
            </h2>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              Tài khoản <strong>{cloudRecord.displayName}</strong> đã có bản lưu trên đám mây, đồng thời máy hiện tại cũng có tiến trình chơi thử. Chọn bản bạn muốn giữ lại:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Cloud Card */}
          <div className="rounded-2xl border border-emerald-400/40 bg-[#060c1c] p-4 flex flex-col justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-black text-emerald-300">
                  <Cloud className="w-4 h-4 shrink-0" />
                  Bản Lưu Đám Mây
                </span>
                <span className="text-[10px] font-semibold text-emerald-200/80">
                  Khuyên dùng
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Lực Chiến</span>
                  <span className="font-mono-nums font-bold text-amber-300">
                    {Math.round(cloudRecord.powerRating).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Chương cao nhất</span>
                  <span className="font-mono-nums font-bold text-white">
                    Chương {cloudRecord.highestChapterCleared}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Vàng / Ngọc Hồn</span>
                  <span className="font-mono-nums font-bold text-white">
                    {(cloudRecord.saveData?.gold ?? 0).toLocaleString('vi-VN')} /{' '}
                    {(cloudRecord.saveData?.gems ?? 0).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cập nhật</span>
                  <span className="font-mono-nums text-[11px] text-slate-300">
                    {formatSyncTime(cloudRecord.updatedAtMs)}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={onChooseCloud}
              className="a2-yellow-btn w-full py-2.5 px-3 rounded-xl text-xs font-black cursor-pointer disabled:opacity-60"
            >
              {busy ? 'Đang tải…' : 'Dùng Bản Đám Mây'}
            </button>
          </div>

          {/* Local Card */}
          <div className="rounded-2xl border border-amber-400/25 bg-[#060916] p-4 flex flex-col justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-black text-amber-200">
                  <HardDrive className="w-4 h-4 shrink-0" />
                  Bản Máy Hiện Tại
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  Chơi thử
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Lực Chiến</span>
                  <span className="font-mono-nums font-bold text-amber-300">
                    {Math.round(localPower).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Chương cao nhất</span>
                  <span className="font-mono-nums font-bold text-white">
                    Chương {localSave.highestChapterCleared}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Vàng / Ngọc Hồn</span>
                  <span className="font-mono-nums font-bold text-white">
                    {localSave.gold.toLocaleString('vi-VN')} /{' '}
                    {localSave.gems.toLocaleString('vi-VN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Anh hùng đã mở</span>
                  <span className="font-mono-nums text-[11px] text-slate-300">
                    {localSave.unlockedHeroes.length}/8
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={onChooseLocal}
              className="a2-slate-btn w-full py-2.5 px-3 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-60"
            >
              {busy ? 'Đang đồng bộ…' : 'Ghi Đè Lên Đám Mây'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
