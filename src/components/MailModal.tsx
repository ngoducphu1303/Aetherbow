import React from 'react';
import { Check, CheckCheck, Mail, Trash2, X } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { RARITY_META } from '../data/gearData';
import { normalizeMailInbox } from '../data/liveOpsData';
import { SaveData } from '../types/game';
import { GoldCoinIcon, SoulGemIcon } from './GameIcons';

interface MailModalProps {
  save: SaveData;
  onClose: () => void;
  onClaimMail: (id: string) => void;
  onClaimAllMail: () => void;
  onDeleteClaimedMail: () => void;
}

export const MailModal: React.FC<MailModalProps> = ({
  save,
  onClose,
  onClaimMail,
  onClaimAllMail,
  onDeleteClaimedMail,
}) => {
  const mails = normalizeMailInbox(save.mailInbox);
  const unreadCount = mails.filter((m) => !m.claimed).length;
  const claimedCount = mails.filter((m) => m.claimed).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#040611]/90">
      <div className="cel-panel-ornate w-full max-w-2xl max-h-[85vh] rounded-3xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 bg-[#0b1229] border-b border-amber-400/25 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-300/60 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-xl font-black text-white">
                Hộp Thư Tinh Giới
              </h2>
              <p className="text-[11px] font-semibold text-slate-300">
                {unreadCount > 0
                  ? `${unreadCount} thư quà tặng đang chờ nhận`
                  : 'Tất cả quà tặng trong hộp thư đã được nhận'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(0.9);
              onClose();
            }}
            aria-label="Đóng hộp thư"
            className="cel-panel w-9 h-9 rounded-xl flex items-center justify-center text-slate-200 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mail List */}
        <div className="flex-1 overflow-y-auto a2-scroll p-4 sm:p-5 space-y-3">
          {mails.length === 0 ? (
            <div className="cel-panel rounded-2xl p-8 text-center text-xs text-slate-400">
              Hộp thư hiện đang trống.
            </div>
          ) : (
            mails.map((mail) => (
              <div
                key={mail.id}
                className={`rounded-2xl p-4 border flex flex-col gap-3 ${
                  mail.claimed
                    ? 'bg-[#070b18]/75 border-slate-800'
                    : 'cel-panel-ornate'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-amber-300">
                      <span>{mail.sender}</span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="text-slate-400">{mail.date}</span>
                    </div>
                    <h3 className="font-display text-sm sm:text-base font-black text-white mt-0.5">
                      {mail.title}
                    </h3>
                  </div>

                  {mail.claimed ? (
                    <span className="text-[11px] font-black text-emerald-400 flex items-center gap-1 shrink-0">
                      <Check className="w-3.5 h-3.5" />
                      <span>Đã Nhận</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playAchievement();
                        onClaimMail(mail.id);
                      }}
                      className="a2-yellow-btn px-3.5 py-1.5 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Nhận Quà
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{mail.body}</p>

                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-amber-400/15 text-xs font-mono-nums font-bold">
                  {mail.rewardGold > 0 && (
                    <span className="flex items-center gap-1 text-amber-300">
                      <GoldCoinIcon className="w-3.5 h-3.5" />+{mail.rewardGold} Vàng
                    </span>
                  )}
                  {mail.rewardGems > 0 && (
                    <span className="flex items-center gap-1 text-purple-300">
                      <SoulGemIcon className="w-3.5 h-3.5" />+{mail.rewardGems} Ngọc Hồn
                    </span>
                  )}
                  {mail.bonusGearRarity && (
                    <span className={`font-black ${RARITY_META[mail.bonusGearRarity].textClass}`}>
                      +1 Trang Bị {mail.bonusSTier ? '[S] ' : ''}
                      {RARITY_META[mail.bonusGearRarity].label}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-3 bg-[#070b1a] border-t border-amber-400/20 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            disabled={claimedCount === 0}
            onClick={() => {
              soundEngine.playUiClick();
              onDeleteClaimedMail();
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              claimedCount > 0
                ? 'a2-slate-btn text-slate-200'
                : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa Thư Đã Nhận</span>
          </button>

          <button
            type="button"
            disabled={unreadCount === 0}
            onClick={() => {
              soundEngine.playAchievement();
              onClaimAllMail();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              unreadCount > 0
                ? 'a2-emerald-btn'
                : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <CheckCheck className="w-4 h-4" />
            <span>Nhận Tất Cả ({unreadCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
