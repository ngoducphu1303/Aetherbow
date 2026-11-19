import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Play, RotateCcw, Sparkles, Volume2, VolumeX } from 'lucide-react';
import splashArtSrc from '../assets/images/celestial_sanctuary_backdrop_1794971371758.jpg';
import { CHAPTERS } from '../data/chaptersData';
import type { AppearanceStatus } from '../engine/GameEngine';
import { getModelDownloadProgress, subscribeToModelDownloads } from '../engine/modelAssets';
import { SaveData } from '../types/game';

interface SplashGateProps {
  save: SaveData;
  appearanceStatus: AppearanceStatus;
  onRetryModels: () => void;
  onEnterGame: () => void;
  onToggleMute: () => void;
}

const SPLASH_ART_SRC = splashArtSrc;

export const SplashGate: React.FC<SplashGateProps> = ({
  save,
  appearanceStatus,
  onRetryModels,
  onEnterGame,
  onToggleMute,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const progress = useSyncExternalStore(subscribeToModelDownloads, getModelDownloadProgress);
  const ready = progress.status === 'ready' && appearanceStatus === 'ready';
  const failed = progress.status === 'error' || appearanceStatus === 'error';

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || (e.code !== 'Enter' && e.code !== 'Space')) return;
      if (e.target instanceof HTMLElement && e.target.closest('button, a, input, textarea, select')) return;
      e.preventDefault();
      if (ready) onEnterGame();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onEnterGame, ready]);

  return (
    <div className="fixed inset-0 z-30 pointer-events-auto flex flex-col justify-between overflow-hidden bg-[#050813]">
      {/* Key Art Layer with Measured Vignette Scrim & Fallback */}
      {!imgFailed ? (
        <img
          src={SPLASH_ART_SRC}
          alt="Thánh Điện Hoàng Đạo Tinh Giới"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="absolute inset-0 w-full h-full object-cover object-center opacity-80"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 35%, rgba(212, 168, 75, 0.16) 0%, rgba(16, 25, 58, 0.88) 48%, #050813 100%)',
          }}
        />
      )}

      {/* Atmospheric Contrast Scrim */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(5, 8, 19, 0.86) 0%, rgba(7, 11, 25, 0.35) 38%, rgba(7, 11, 25, 0.45) 64%, rgba(4, 6, 15, 0.96) 100%)',
        }}
      />

      {/* Subtle Gilded Frame Perimeter */}
      <div className="absolute inset-3 sm:inset-5 border border-amber-300/20 rounded-3xl pointer-events-none" />

      {/* Top Row: Clean Progress Metadata + Sound Toggle */}
      <header className="relative z-10 flex items-center justify-between max-w-5xl w-full mx-auto px-5 sm:px-8 pt-5 sm:pt-7">
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

      {/* Center Crest & Sculpted Title */}
      <div className="relative z-10 flex flex-col items-center text-center px-4">
        <div className="a2-float flex flex-col items-center">
          {/* Celestial Bow & Crescent Emblem */}
          <svg
            viewBox="0 0 120 72"
            className="w-24 sm:w-28 h-auto drop-shadow-[0_6px_18px_rgba(234,179,8,0.4)] mb-2"
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
            <circle cx="60" cy="36" r="28" fill="none" stroke="url(#splashCrestGold)" strokeWidth="1.4" opacity="0.55" strokeDasharray="4 4" />
            <path
              d="M48 12 C32 24, 32 48, 48 60 C40 46, 40 26, 48 12 Z"
              fill="url(#splashCrestGold)"
            />
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

          <h1 className="font-display text-4xl sm:text-6xl font-black tracking-[0.14em] text-transparent bg-clip-text bg-gradient-to-b from-[#fef9c3] via-[#f5c451] to-[#b47812] drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]">
            ARTEMIS 3D
          </h1>

          <div className="flex items-center gap-3 mt-2 w-64 sm:w-80">
            <span className="cel-divider-gold flex-1" />
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.28em] text-amber-200/95 whitespace-nowrap">
              Hoàng Đạo Tinh Giới
            </span>
            <span className="cel-divider-gold flex-1" />
          </div>
        </div>
      </div>

      {/* Bottom Enter CTA Dock */}
      <div className="relative z-10 max-w-md w-full mx-auto flex flex-col items-center gap-3.5 px-5 pb-7 sm:pb-9">
        <div className="flex items-center gap-2 text-xs text-slate-200 font-medium tracking-wide text-center">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span>8 Anh Hùng Chibi · 12 Chương Hoàng Đạo · Điện Thần 3D</span>
        </div>

        <div className="w-full rounded-2xl border border-amber-200/30 bg-[#090d1b]/90 p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-amber-100">
            <span role={failed ? 'alert' : 'status'}>
              {failed ? 'Không tải được mô hình 3D' : ready ? 'Mô hình 3D đã sẵn sàng' : progress.status === 'ready'
                ? 'Đang chuẩn bị ngoại hình đã trang bị…' : 'Đang tải mô hình 3D…'}
            </span>
            <span className="tabular-nums">{progress.percent}%</span>
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
          <div className="mt-2 text-right text-[10px] tabular-nums text-slate-300">
            {progress.completed}/{progress.total} mô hình
          </div>
        </div>

        <button
          type="button"
          data-start={ready ? 'true' : undefined}
          disabled={!ready && !failed}
          onClick={failed ? onRetryModels : onEnterGame}
          className="a2-yellow-btn w-full py-4 px-8 rounded-2xl font-display font-black text-base sm:text-lg tracking-[0.12em] flex items-center justify-center gap-3 cursor-pointer whitespace-nowrap disabled:cursor-wait disabled:opacity-55"
        >
          {failed ? <RotateCcw className="w-5 h-5 shrink-0" /> : ready
            ? <Play className="w-5 h-5 fill-current shrink-0" />
            : <span aria-hidden="true" className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />}
          <span>{failed ? 'THỬ LẠI' : ready ? 'CHẠM ĐỂ VÀO GAME' : 'ĐANG TẢI'}</span>
        </button>

        <div className="text-[11px] text-slate-300/85 text-center tracking-wide">
          Di chuyển né đòn · Dừng lại tự động bắn · Lướt né (Space) · Chiêu Cuối (Q)
        </div>
      </div>
    </div>
  );
};
