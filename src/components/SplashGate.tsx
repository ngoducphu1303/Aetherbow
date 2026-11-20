import React, { useEffect, useState, useSyncExternalStore } from 'react';
import {
  CheckCircle2,
  Cloud,
  LogOut,
  Play,
  RotateCcw,
  Sparkles,
  User as UserIcon,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import splashArtSrc from '../assets/images/celestial_sanctuary_backdrop_1794971371758.jpg';
import { CHAPTERS } from '../data/chaptersData';
import type { AppearanceStatus } from '../engine/GameEngine';
import { getModelDownloadProgress, subscribeToModelDownloads } from '../engine/modelAssets';
import {
  CloudSyncStatus,
  formatAccountHandle,
} from '../services/playerCloudService';
import { SaveData } from '../types/game';
import { AuthGatePanel } from './AuthGatePanel';

interface SplashGateProps {
  save: SaveData;
  powerRating: number;
  appearanceStatus: AppearanceStatus;
  authReady: boolean;
  currentUser: User | null;
  playerDisplayName: string;
  cloudSyncStatus: CloudSyncStatus;
  lastSyncedAt: number | null;
  guestModeSelected: boolean;
  onAuthSuccess: (user: User, displayNameOverride?: string) => Promise<void>;
  onContinueGuest: () => void;
  onSignOut: () => Promise<void>;
  onRetryModels: () => void;
  onEnterGame: () => void;
  onToggleMute: () => void;
}

const SPLASH_ART_SRC = splashArtSrc;

function formatTimeShort(ms: number | null): string {
  if (!ms) return '';
  try {
    return new Date(ms).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export const SplashGate: React.FC<SplashGateProps> = ({
  save,
  powerRating,
  appearanceStatus,
  authReady,
  currentUser,
  playerDisplayName,
  cloudSyncStatus,
  lastSyncedAt,
  guestModeSelected,
  onAuthSuccess,
  onContinueGuest,
  onSignOut,
  onRetryModels,
  onEnterGame,
  onToggleMute,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const progress = useSyncExternalStore(subscribeToModelDownloads, getModelDownloadProgress);
  const ready = progress.status === 'ready' && appearanceStatus === 'ready';
  const failed = progress.status === 'error' || appearanceStatus === 'error';
  const canProceedDirect = Boolean(currentUser) || guestModeSelected;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || (e.code !== 'Enter' && e.code !== 'Space')) return;
      if (e.target instanceof HTMLElement && e.target.closest('button, a, input, textarea, select')) return;
      if (!canProceedDirect || !ready) return;
      e.preventDefault();
      onEnterGame();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canProceedDirect, onEnterGame, ready]);

  const handleSignOutClick = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await onSignOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="fixed inset-0 z-30 pointer-events-auto flex flex-col justify-between overflow-y-auto bg-[#050813]">
      {/* Key Art Layer with Measured Vignette Scrim & Fallback */}
      {!imgFailed ? (
        <img
          src={SPLASH_ART_SRC}
          alt="Thánh Điện Hoàng Đạo Tinh Giới"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="fixed inset-0 w-full h-full object-cover object-center opacity-75 pointer-events-none"
        />
      ) : (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 35%, rgba(212, 168, 75, 0.16) 0%, rgba(16, 25, 58, 0.88) 48%, #050813 100%)',
          }}
        />
      )}

      {/* Atmospheric Contrast Scrim */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(5, 8, 19, 0.86) 0%, rgba(7, 11, 25, 0.48) 42%, rgba(5, 8, 19, 0.88) 100%)',
        }}
      />

      {/* Subtle Gilded Frame Perimeter */}
      <div className="fixed inset-3 sm:inset-4 border border-amber-300/20 rounded-3xl pointer-events-none" />

      {/* Top Row: Clean Progress Metadata + Sound Toggle */}
      <header className="relative z-10 flex items-center justify-between max-w-6xl w-full mx-auto px-5 sm:px-8 pt-4 sm:pt-6 shrink-0">
        <div className="flex items-center gap-2.5 text-xs font-semibold text-amber-200/90 tracking-wide">
          <span>Hoàng Đạo Tinh Giới</span>
          <span aria-hidden="true" className="text-amber-400/50">·</span>
          <span className="font-mono-nums text-slate-200">
            {save.highestChapterCleared}/{CHAPTERS.length} Chương
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={save.muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          className="cel-panel w-10 h-10 rounded-xl flex items-center justify-center text-slate-200 hover:border-amber-300 transition-colors cursor-pointer"
        >
          {save.muted ? (
            <VolumeX className="w-4 h-4 text-slate-400" />
          ) : (
            <Volume2 className="w-4 h-4 text-amber-300" />
          )}
        </button>
      </header>

      {/* Main 2-Column Center Workspace */}
      <main className="relative z-10 max-w-6xl w-full mx-auto px-5 sm:px-8 py-4 grid grid-cols-1 lg:grid-cols-12 items-center gap-6 lg:gap-8 my-auto">
        {/* Left Column: Sculpted Crest, Title & 3D Asset Loader */}
        <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left">
          <div className="a2-float flex flex-col items-center lg:items-start">
            <svg
              viewBox="0 0 120 72"
              className="w-20 sm:w-24 h-auto drop-shadow-[0_6px_18px_rgba(234,179,8,0.4)] mb-2"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="splashCrestGold" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fef9c3" />
                  <stop offset="50%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#a16207" />
                </linearGradient>
                <linearGradient id="splashCrestJade" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6ee7b7" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
              <circle
                cx="60"
                cy="36"
                r="28"
                fill="none"
                stroke="url(#splashCrestGold)"
                strokeWidth="1.4"
                opacity="0.55"
                strokeDasharray="4 4"
              />
              <path d="M48 12 C32 24, 32 48, 48 60 C40 46, 40 26, 48 12 Z" fill="url(#splashCrestGold)" />
              <path
                d="M52 14 C66 26, 66 46, 52 58"
                fill="none"
                stroke="url(#splashCrestJade)"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <line x1="28" y1="36" x2="90" y2="36" stroke="url(#splashCrestJade)" strokeWidth="2.4" strokeLinecap="round" />
              <polygon points="96,36 84,30 87,36 84,42" fill="#6ee7b7" />
            </svg>

            <h1 className="font-display text-4xl sm:text-5xl xl:text-6xl font-black tracking-[0.12em] text-transparent bg-clip-text bg-gradient-to-b from-[#fef9c3] via-[#f5c451] to-[#b47812] drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]">
              ARTEMIS 3D
            </h1>

            <div className="flex items-center gap-3 mt-2 w-64 sm:w-80">
              <span className="cel-divider-gold flex-1" />
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.26em] text-amber-200/95 whitespace-nowrap">
                Hoàng Đạo Tinh Giới
              </span>
              <span className="cel-divider-gold flex-1" />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-200 font-medium tracking-wide mt-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>8 Anh Hùng Chibi · 12 Chương Hoàng Đạo · Điện Thần 3D</span>
          </div>

          {/* 3D Model Readiness Progress */}
          <div className="w-full max-w-md mt-4">
            {!ready || failed ? (
              <div className="rounded-2xl border border-amber-200/30 bg-[#090d1b]/92 p-3 shadow-xl">
                <div className="mb-1.5 flex items-center justify-between gap-3 text-xs font-bold text-amber-100">
                  <span role={failed ? 'alert' : 'status'}>
                    {failed
                      ? 'Không tải được mô hình 3D'
                      : progress.status === 'ready'
                      ? 'Đang chuẩn bị ngoại hình đã trang bị…'
                      : 'Đang tải mô hình 3D…'}
                  </span>
                  <span className="font-mono-nums">{progress.percent}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Tiến độ tải mô hình 3D"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress.percent}
                  className="h-2 overflow-hidden rounded-full bg-amber-200/15"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-200 transition-[width] duration-150 motion-reduce:transition-none"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-300">
                  <span>Tài nguyên 3D đang nạp sẵn cho sảnh</span>
                  <span className="font-mono-nums">
                    {progress.completed}/{progress.total} mô hình
                  </span>
                </div>
                {failed && (
                  <button
                    type="button"
                    onClick={onRetryModels}
                    className="mt-2.5 a2-slate-btn px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Thử tải lại mô hình 3D</span>
                  </button>
                )}
              </div>
            ) : (
              <div
                role="status"
                className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-300"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Sân khấu 3D đã sẵn sàng chiến đấu</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Account Auth Gate OR Authenticated Warrior Enter Card */}
        <div className="lg:col-span-6 flex justify-center lg:justify-end">
          {!authReady ? (
            <div className="cel-panel-ornate w-full max-w-[440px] rounded-3xl p-6 text-center space-y-3">
              <div className="mx-auto size-7 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
              <div className="text-sm font-bold text-white">
                Đang kết nối hệ thống tài khoản đám mây…
              </div>
              <p className="text-xs text-slate-400">
                Kiểm tra phiên đăng nhập Firebase và đồng bộ tiến trình gần nhất.
              </p>
            </div>
          ) : currentUser ? (
            <div className="cel-panel-ornate w-full max-w-[440px] rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-amber-400/15 border border-amber-300/50 flex items-center justify-center text-amber-300 shrink-0">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1.5">
                      <Cloud className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {cloudSyncStatus === 'loading' || cloudSyncStatus === 'syncing'
                          ? 'Đang đồng bộ đám mây…'
                          : lastSyncedAt
                          ? `Đã đồng bộ đám mây · ${formatTimeShort(lastSyncedAt)}`
                          : 'Tài khoản đám mây đã kết nối'}
                      </span>
                    </div>
                    <h2 className="font-display text-lg font-black text-white truncate">
                      {playerDisplayName}
                    </h2>
                    <div className="text-xs text-slate-400 truncate">
                      {formatAccountHandle(currentUser.email)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Quick Telemetry */}
              <div className="grid grid-cols-3 gap-2 text-center bg-[#050813] border border-amber-400/20 rounded-2xl p-3">
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold">Lực Chiến</div>
                  <div className="font-mono-nums text-sm font-black text-amber-300 mt-0.5">
                    {powerRating.toLocaleString('vi-VN')}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold">Tiến Độ</div>
                  <div className="font-mono-nums text-sm font-black text-white mt-0.5">
                    {save.highestChapterCleared}/{CHAPTERS.length}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold">Anh Hùng</div>
                  <div className="font-mono-nums text-sm font-black text-emerald-300 mt-0.5">
                    {save.unlockedHeroes.length}/8
                  </div>
                </div>
              </div>

              <button
                type="button"
                data-start={ready ? 'true' : undefined}
                disabled={(!ready && !failed) || cloudSyncStatus === 'loading'}
                onClick={failed ? onRetryModels : onEnterGame}
                className="a2-yellow-btn w-full py-3.5 px-6 rounded-2xl font-display font-black text-base tracking-[0.1em] flex items-center justify-center gap-2.5 cursor-pointer whitespace-nowrap disabled:cursor-wait disabled:opacity-55"
              >
                {failed ? (
                  <RotateCcw className="w-5 h-5 shrink-0" />
                ) : ready && cloudSyncStatus !== 'loading' ? (
                  <Play className="w-5 h-5 fill-current shrink-0" />
                ) : (
                  <span
                    aria-hidden="true"
                    className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
                  />
                )}
                <span>
                  {failed
                    ? 'THỬ LẠI'
                    : cloudSyncStatus === 'loading'
                    ? 'ĐANG TẢI DỮ LIỆU…'
                    : ready
                    ? 'VÀO SẢNH CHIẾN ĐẤU'
                    : 'ĐANG TẢI 3D…'}
                </span>
              </button>

              <button
                type="button"
                disabled={signingOut}
                onClick={handleSignOutClick}
                className="a2-slate-btn w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{signingOut ? 'Đang đăng xuất…' : 'Đổi Tài Khoản Khác'}</span>
              </button>
            </div>
          ) : guestModeSelected ? (
            <div className="cel-panel-ornate w-full max-w-[440px] rounded-3xl p-5 sm:p-6 space-y-4">
              <div>
                <div className="text-xs font-semibold text-amber-300">Chế Độ Chơi Thử (Khách)</div>
                <h2 className="font-display text-lg font-black text-white mt-0.5">
                  Sẵn sàng trải nghiệm Artemis 3D
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  Dữ liệu tạm lưu trên trình duyệt này. Bạn có thể liên kết tài khoản đám mây bất kỳ lúc nào trong mục Hồ Sơ để không mất tiến trình.
                </p>
              </div>
              <button
                type="button"
                data-start={ready ? 'true' : undefined}
                disabled={!ready && !failed}
                onClick={failed ? onRetryModels : onEnterGame}
                className="a2-yellow-btn w-full py-3.5 px-6 rounded-2xl font-display font-black text-base tracking-[0.1em] flex items-center justify-center gap-2.5 cursor-pointer whitespace-nowrap disabled:cursor-wait disabled:opacity-55"
              >
                {failed ? (
                  <RotateCcw className="w-5 h-5 shrink-0" />
                ) : ready ? (
                  <Play className="w-5 h-5 fill-current shrink-0" />
                ) : (
                  <span
                    aria-hidden="true"
                    className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
                  />
                )}
                <span>{failed ? 'THỬ LẠI' : ready ? 'VÀO GAME (KHÁCH)' : 'ĐANG TẢI 3D…'}</span>
              </button>
            </div>
          ) : (
            <AuthGatePanel
              compact
              allowGuest
              onAuthSuccess={onAuthSuccess}
              onContinueGuest={onContinueGuest}
            />
          )}
        </div>
      </main>

      {/* Bottom Controls Hint */}
      <footer className="relative z-10 max-w-6xl w-full mx-auto px-5 pb-4 sm:pb-6 text-center shrink-0">
        <div className="text-[11px] text-slate-300/85 tracking-wide">
          Di chuyển né đòn · Dừng lại tự bắn · Lướt (Space) · Chiêu (E) · Tuyệt Kỹ (Q)
        </div>
      </footer>
    </div>
  );
};
