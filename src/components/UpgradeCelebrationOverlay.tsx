import React, { useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { triggerHapticPulse } from '../engine/aaaWave4Director';

export interface UpgradeCelebrationState {
  id: number;
  title: string;
  detail: string;
}

interface UpgradeCelebrationOverlayProps {
  celebration: UpgradeCelebrationState | null;
  hapticsEnabled?: boolean;
}

export const UpgradeCelebrationOverlay: React.FC<UpgradeCelebrationOverlayProps> = ({
  celebration,
  hapticsEnabled = true,
}) => {
  const celebrationId = celebration?.id ?? null;

  useEffect(() => {
    if (celebrationId === null) return;
    soundEngine.playForgeAnvilImpact();
    triggerHapticPulse('forge', hapticsEnabled);
  }, [celebrationId, hapticsEnabled]);

  if (!celebration) return null;

  return (
    <div
      key={celebration.id}
      className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center"
    >
      <div className="relative flex items-center justify-center">
        {/* Radial celestial sunburst behind anvil strike */}
        <div
          aria-hidden="true"
          className="aaa-forge-sunburst absolute h-72 w-72 rounded-full"
          style={{
            background:
              'conic-gradient(from 0deg, transparent 0deg 22deg, rgba(251,191,36,0.34) 30deg, transparent 38deg 68deg, rgba(253,224,71,0.28) 76deg, transparent 84deg 112deg, rgba(245,158,11,0.34) 120deg, transparent 128deg 162deg, rgba(251,191,36,0.3) 170deg, transparent 178deg 212deg, rgba(253,224,71,0.28) 220deg, transparent 228deg 262deg, rgba(245,158,11,0.34) 270deg, transparent 278deg 312deg, rgba(251,191,36,0.3) 320deg, transparent 328deg 360deg)',
          }}
        />

        {/* Forge anvil horizontal shockwave */}
        <div
          aria-hidden="true"
          className="aaa-forge-anvil-ring absolute h-40 w-40 rounded-full border-2 border-amber-200/90 shadow-[0_0_48px_rgba(251,191,36,0.65)]"
        />

        {/* Secondary golden shimmer ring (compositor-only transform + opacity) */}
        <div
          aria-hidden="true"
          className="a2-gold-upgrade-ring absolute h-48 w-48 rounded-full border border-amber-300/75 shadow-[0_0_36px_rgba(245,158,11,0.45)]"
        />

        {/* Celebratory forge crest plaque with metallic sheen sweep */}
        <div className="a2-gold-upgrade-banner relative overflow-hidden flex flex-col items-center rounded-2xl border-2 border-amber-300/85 bg-gradient-to-b from-[#2b1d08]/96 via-[#181226]/96 to-[#0d0b1a]/96 px-8 py-4.5 text-center shadow-[0_18px_56px_rgba(245,158,11,0.48)]">
          <div
            aria-hidden="true"
            className="aaa-forge-sheen pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-amber-200/35 to-transparent"
          />
          <div className="relative z-[1] mb-1 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">
            <Sparkles className="h-3 w-3 shrink-0" />
            <span>Rèn Đúc Hoàng Kim</span>
          </div>
          <div className="relative z-[1] font-display text-xl font-black tracking-tight text-amber-50">
            {celebration.title}
          </div>
          <div className="relative z-[1] mt-1 font-mono-nums text-xs font-extrabold text-emerald-300">
            {celebration.detail}
          </div>
        </div>
      </div>
    </div>
  );
};
