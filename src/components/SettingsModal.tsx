import React from 'react';
import { Monitor, RotateCcw, Sliders, Volume2, VolumeX, X } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { GameSettings, GraphicsQuality } from '../types/game';

interface SettingsModalProps {
  settings: GameSettings;
  muted: boolean;
  onUpdateSettings: (patch: Partial<GameSettings>) => void;
  onToggleMute: () => void;
  onReplayTutorial?: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  muted,
  onUpdateSettings,
  onToggleMute,
  onReplayTutorial,
  onClose,
}) => {
  const qualityOptions: Array<{ id: GraphicsQuality; label: string; hint: string }> = [
    { id: 'low', label: 'Thấp', hint: 'Tối ưu FPS' },
    { id: 'medium', label: 'Trung Bình', hint: 'Cân bằng' },
    { id: 'high', label: 'Cao', hint: 'Đổ bóng & Hạt 3D' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040611]/90">
      <div className="cel-panel-ornate w-full max-w-md rounded-3xl p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-amber-400/25 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-300" />
            <h2 className="font-display text-lg font-black text-white">
              Cài Đặt Hệ Thống
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(0.9);
              onClose();
            }}
            aria-label="Đóng Cài Đặt"
            className="cel-panel w-8 h-8 rounded-xl flex items-center justify-center text-slate-200 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Audio Sliders */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4" />
              <span>Âm Thanh &amp; Nhạc Nền</span>
            </span>
            <button
              type="button"
              onClick={onToggleMute}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                muted
                  ? 'bg-rose-500/20 border border-rose-400/50 text-rose-200'
                  : 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-200'
              }`}
            >
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{muted ? 'Đang Tắt Tiếng' : 'Đang Bật Tiếng'}</span>
            </button>
          </div>

          {[
            { key: 'masterVol' as const, label: 'Âm lượng tổng', val: settings.masterVol },
            { key: 'bgmVol' as const, label: 'Nhạc nền (BGM)', val: settings.bgmVol },
            { key: 'sfxVol' as const, label: 'Hiệu ứng chiến đấu (SFX)', val: settings.sfxVol },
          ].map((item) => (
            <div key={item.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-200 font-semibold">{item.label}</span>
                <span className="font-mono-nums font-bold text-amber-200">
                  {Math.round(item.val * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(item.val * 100)}
                onChange={(e) =>
                  onUpdateSettings({ [item.key]: Number(e.target.value) / 100 })
                }
                className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-900 rounded-lg"
              />
            </div>
          ))}
        </div>

        <div className="cel-divider-gold" />

        {/* 3D Graphics Quality */}
        <div className="space-y-2.5">
          <div className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <Monitor className="w-4 h-4" />
            <span>Chất Lượng Đồ Họa 3D</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {qualityOptions.map((opt) => {
              const active = settings.graphicsQuality === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick(1.05);
                    onUpdateSettings({ graphicsQuality: opt.id });
                  }}
                  className={`py-2 px-2 rounded-xl text-center border cursor-pointer transition-colors ${
                    active
                      ? 'a2-yellow-btn'
                      : 'bg-[#080d1e] border-amber-400/25 text-slate-200 hover:border-amber-300'
                  }`}
                >
                  <div className="text-xs font-black">{opt.label}</div>
                  <div
                    className={`text-[10px] mt-0.5 ${
                      active ? 'text-slate-900 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {opt.hint}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Combat & 3D Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onUpdateSettings({ screenShake: !settings.screenShake });
            }}
            className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
              settings.screenShake
                ? 'bg-emerald-500/15 border-emerald-400/55 text-emerald-100'
                : 'bg-[#080d1e] border-slate-700 text-slate-400'
            }`}
          >
            <div className="text-xs font-black">Rung Camera</div>
            <div className="text-[11px] mt-0.5 font-semibold">
              {settings.screenShake ? 'Đang bật' : 'Đã tắt'}
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onUpdateSettings({ showDamageNumbers: !settings.showDamageNumbers });
            }}
            className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
              settings.showDamageNumbers
                ? 'bg-emerald-500/15 border-emerald-400/55 text-emerald-100'
                : 'bg-[#080d1e] border-slate-700 text-slate-400'
            }`}
          >
            <div className="text-xs font-black">Số Sát Thương</div>
            <div className="text-[11px] mt-0.5 font-semibold">
              {settings.showDamageNumbers ? 'Đang hiện' : 'Đã ẩn'}
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onUpdateSettings({ starfallWeather: settings.starfallWeather === false });
            }}
            className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
              settings.starfallWeather !== false
                ? 'bg-emerald-500/15 border-emerald-400/55 text-emerald-100'
                : 'bg-[#080d1e] border-slate-700 text-slate-400'
            }`}
          >
            <div className="text-xs font-black">Mưa Sao Băng 3D</div>
            <div className="text-[11px] mt-0.5 font-semibold">
              {settings.starfallWeather !== false ? 'Đang bật' : 'Đã tắt'}
            </div>
          </button>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          {onReplayTutorial && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onReplayTutorial();
                onClose();
              }}
              className="a2-slate-btn w-full py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
              <span>Xem Lại Hướng Dẫn Tân Thủ</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onClose();
            }}
            className="a2-yellow-btn w-full py-2.5 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap"
          >
            Lưu &amp; Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
