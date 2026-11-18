import React from 'react';
import { AVATAR_FRAME_MAP } from '../data/wave7Data';
import { AvatarFrameId, GearSlot, HeroId, Rarity, WeaponArchetype } from '../types/game';

export const RARITY_FRAME_CLASS: Record<Rarity, string> = {
  [Rarity.COMMON]: 'a2-q-common',
  [Rarity.RARE]: 'a2-q-rare',
  [Rarity.EPIC]: 'a2-q-epic',
  [Rarity.LEGENDARY]: 'a2-q-legendary',
  [Rarity.MYTHIC]: 'a2-q-mythic',
};

export const SLOT_LABELS: Record<GearSlot, string> = {
  [GearSlot.WEAPON]: 'Vũ Khí',
  [GearSlot.NECKLACE]: 'Dây Chuyền',
  [GearSlot.RING]: 'Nhẫn',
  [GearSlot.ARMOR]: 'Áo Giáp',
  [GearSlot.HELMET]: 'Mũ',
  [GearSlot.BOOTS]: 'Giày',
};

export const GoldCoinIcon: React.FC<{ className?: string }> = ({
  className = 'w-4 h-4',
}) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <defs>
      <radialGradient id="celGoldCoin" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="55%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#92400e" />
      </radialGradient>
    </defs>
    <circle cx="12" cy="12" r="10" fill="url(#celGoldCoin)" stroke="#fef9c3" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="6.5" fill="none" stroke="#78350f" strokeWidth="1" opacity="0.55" />
    <polygon points="12,7.5 14.5,12 12,16.5 9.5,12" fill="#fef9c3" opacity="0.9" />
  </svg>
);

export const SoulGemIcon: React.FC<{ className?: string }> = ({
  className = 'w-4 h-4',
}) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="celSoulGem" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f5d0fe" />
        <stop offset="50%" stopColor="#a855f7" />
        <stop offset="100%" stopColor="#581c87" />
      </linearGradient>
    </defs>
    <polygon
      points="12,2 21,9 17.5,21 6.5,21 3,9"
      fill="url(#celSoulGem)"
      stroke="#f3e8ff"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <polygon points="12,5 17,9.5 12,18 7,9.5" fill="#e9d5ff" opacity="0.4" />
  </svg>
);

export const StarDustIcon: React.FC<{ className?: string }> = ({
  className = 'w-4 h-4',
}) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="celStarDust" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#e0f2fe" />
        <stop offset="55%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#1e40af" />
      </linearGradient>
    </defs>
    <polygon
      points="12,2 14.8,9.2 22,12 14.8,14.8 12,22 9.2,14.8 2,12 9.2,9.2"
      fill="url(#celStarDust)"
      stroke="#e0f2fe"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="2.2" fill="#ffffff" />
  </svg>
);

export const PetEssenceIcon: React.FC<{ className?: string }> = ({
  className = 'w-4 h-4',
}) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="celPetEssence" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#d1fae5" />
        <stop offset="55%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#065f46" />
      </linearGradient>
    </defs>
    <path
      d="M12 2.5 C16.5 7, 19.5 10.8, 19.5 14.8 C19.5 18.8, 16.2 21.5, 12 21.5 C7.8 21.5, 4.5 18.8, 4.5 14.8 C4.5 10.8, 7.5 7, 12 2.5 Z"
      fill="url(#celPetEssence)"
      stroke="#d1fae5"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <polygon points="12,9.5 14.5,14 12,17.5 9.5,14" fill="#fef08a" opacity="0.9" />
  </svg>
);

export const GearSlotSvg: React.FC<{
  slot: GearSlot;
  weaponArchetype?: WeaponArchetype;
  accentHex?: number;
  className?: string;
}> = ({ slot, weaponArchetype = 'bow', accentHex = 0xfbbf24, className = 'w-8 h-8' }) => {
  const accent = `#${accentHex.toString(16).padStart(6, '0')}`;

  if (slot === GearSlot.WEAPON) {
    if (weaponArchetype === 'staff') {
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
          <line x1="12" y1="38" x2="32" y2="16" stroke="#fde68a" strokeWidth="4" strokeLinecap="round" />
          <circle cx="34" cy="14" r="7" fill={accent} stroke="#fffbeb" strokeWidth="2" />
          <circle cx="34" cy="14" r="3" fill="#ffffff" />
          <path d="M26 12 L30 6 M36 22 L42 18" stroke="#fef08a" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    }
    if (weaponArchetype === 'claw') {
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
          <path d="M12 36 L22 26 L16 14 L26 22 L28 10 L32 23 L40 16 L33 29 L18 40 Z" fill={accent} stroke="#fff7ed" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
        <path d="M14 10 C32 14, 34 34, 14 38" fill="none" stroke="#fde68a" strokeWidth="4" strokeLinecap="round" />
        <line x1="14" y1="11" x2="14" y2="37" stroke="#e2e8f0" strokeWidth="1.6" />
        <line x1="10" y1="24" x2="38" y2="24" stroke={accent} strokeWidth="3" strokeLinecap="round" />
        <polygon points="41,24 33,19 35,24 33,29" fill="#fef08a" />
      </svg>
    );
  }

  if (slot === GearSlot.ARMOR) {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
        <path
          d="M15 10 L21 13 L27 13 L33 10 L40 16 L36 24 L33 22 L33 38 L15 38 L15 22 L12 24 L8 16 Z"
          fill={accent}
          stroke="#f8fafc"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <polygon points="24,18 28,24 24,31 20,24" fill="#fef08a" />
      </svg>
    );
  }

  if (slot === GearSlot.HELMET) {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
        <path
          d="M12 28 C12 16, 36 16, 36 28 L38 35 L29 35 L27 29 L21 29 L19 35 L10 35 Z"
          fill={accent}
          stroke="#f8fafc"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M20 14 L24 7 L28 14" fill="#fde047" stroke="#fffbeb" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  }

  if (slot === GearSlot.RING) {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
        <circle cx="24" cy="27" r="11" fill="none" stroke="#fde047" strokeWidth="4.5" />
        <polygon points="24,9 30,15 24,21 18,15" fill={accent} stroke="#ffffff" strokeWidth="1.8" />
      </svg>
    );
  }

  if (slot === GearSlot.NECKLACE) {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
        <path d="M12 13 C14 26, 34 26, 36 13" fill="none" stroke="#fde68a" strokeWidth="3" strokeLinecap="round" />
        <polygon points="24,22 31,30 24,39 17,30" fill={accent} stroke="#ffffff" strokeWidth="2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        d="M15 11 L25 11 L26 27 L37 30 L37 37 L13 37 L15 11 Z"
        fill={accent}
        stroke="#f8fafc"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <line x1="15" y1="18" x2="25" y2="18" stroke="#fef08a" strokeWidth="2.5" />
    </svg>
  );
};

export const HeroCrestSvg: React.FC<{
  heroId: HeroId;
  accentHex: number;
  cloakHex: number;
  hairHex: number;
  className?: string;
}> = ({ heroId, accentHex, cloakHex, hairHex, className = 'w-12 h-12' }) => {
  const accent = `#${accentHex.toString(16).padStart(6, '0')}`;
  const cloak = `#${cloakHex.toString(16).padStart(6, '0')}`;
  const hair = `#${hairHex.toString(16).padStart(6, '0')}`;

  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`bg_${heroId}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.45" />
          <stop offset="100%" stopColor={cloak} stopOpacity="0.95" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30.5" fill="none" stroke="#d4a84b" strokeWidth="1" opacity="0.7" />
      <circle cx="32" cy="32" r="28" fill={`url(#bg_${heroId})`} stroke="#fef08a" strokeWidth="2" />
      <path d="M13 54 C16 40, 48 40, 51 54 Z" fill={cloak} stroke={accent} strokeWidth="2" />
      <circle cx="32" cy="27" r="14" fill={hair} />
      <circle cx="32" cy="30" r="11" fill="#fde2cc" />
      <ellipse cx="27.5" cy="31" rx="2.3" ry="2.8" fill={accent} />
      <ellipse cx="36.5" cy="31" rx="2.3" ry="2.8" fill={accent} />
      <circle cx="28" cy="30" r="0.9" fill="#ffffff" />
      <circle cx="37" cy="30" r="0.9" fill="#ffffff" />
      {heroId === 'artemis' && (
        <path d="M23 18 C25 10, 39 10, 41 18 C36 14, 28 14, 23 18 Z" fill="#e2e8f0" stroke="#10b981" strokeWidth="1.5" />
      )}
      {heroId === 'thor' && (
        <path d="M16 20 L22 12 L25 20 M48 20 L42 12 L39 20" fill="#fef08a" stroke="#38bdf8" strokeWidth="1.5" />
      )}
      {heroId === 'wukong' && (
        <path d="M20 20 Q32 13 44 20" fill="none" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" />
      )}
      {heroId === 'atreus' && (
        <path d="M18 22 L15 10 L24 18 M46 22 L49 10 L40 18" fill="#f43f5e" />
      )}
      {heroId !== 'artemis' && heroId !== 'thor' && heroId !== 'wukong' && heroId !== 'atreus' && (
        <polygon points="32,10 36,18 28,18" fill={accent} stroke="#fef08a" strokeWidth="1.2" />
      )}
    </svg>
  );
};

export const ChestSvg: React.FC<{ variant: 'iron' | 'mythic' | 'rune_bag' | 'rune_rare'; className?: string }> = ({
  variant,
  className = 'w-14 h-14',
}) => {
  const isMythic = variant === 'mythic';
  const isRuneRare = variant === 'rune_rare';
  const isRuneBag = variant === 'rune_bag';

  if (isRuneBag || isRuneRare) {
    const main = isRuneRare ? '#9333ea' : '#0284c7';
    const rim = isRuneRare ? '#f0abfc' : '#7dd3fc';
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <polygon points="32,8 52,22 46,50 18,50 12,22" fill={main} stroke={rim} strokeWidth="2.5" strokeLinejoin="round" />
        <polygon points="32,16 42,28 32,42 22,28" fill="#fde047" stroke="#ffffff" strokeWidth="1.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect
        x="10"
        y="22"
        width="44"
        height="30"
        rx="6"
        fill={isMythic ? '#7e22ce' : '#475569'}
        stroke={isMythic ? '#fde047' : '#cbd5e1'}
        strokeWidth="2.5"
      />
      <path
        d="M10 26 C10 14, 54 14, 54 26 Z"
        fill={isMythic ? '#a855f7' : '#64748b'}
        stroke={isMythic ? '#fef08a' : '#e2e8f0'}
        strokeWidth="2.5"
      />
      <rect x="27" y="25" width="10" height="12" rx="3" fill="#fbbf24" stroke="#fffbeb" strokeWidth="1.5" />
      <line x1="10" y1="30" x2="54" y2="30" stroke={isMythic ? '#fde047' : '#94a3b8'} strokeWidth="2.5" />
    </svg>
  );
};

export const WingFeatherIcon: React.FC<{ className?: string }> = ({
  className = 'w-4 h-4',
}) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="celWingFeather" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="55%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
    </defs>
    <path
      d="M20 3 C12 3, 6 9, 4 19 L9 17 L8 21 L12 16 C16 14, 20 10, 20 3 Z"
      fill="url(#celWingFeather)"
      stroke="#fef9c3"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <line x1="5" y1="20" x2="17" y2="6" stroke="#fffbeb" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const ZodiacAvatar: React.FC<{
  heroId: HeroId;
  accentHex: number;
  cloakHex: number;
  hairHex: number;
  frameId?: AvatarFrameId;
  sizeClass?: string;
}> = ({
  heroId,
  accentHex,
  cloakHex,
  hairHex,
  frameId = 'default_gold',
  sizeClass = 'w-10 h-10',
}) => {
  const frame = AVATAR_FRAME_MAP[frameId] ?? AVATAR_FRAME_MAP.default_gold;
  return (
    <div
      className={`relative rounded-full p-0.5 flex items-center justify-center shrink-0 ${frame.ringClass} ${sizeClass}`}
      style={{ boxShadow: `0 0 14px ${frame.glowColor}` }}
    >
      <HeroCrestSvg
        heroId={heroId}
        accentHex={accentHex}
        cloakHex={cloakHex}
        hairHex={hairHex}
        className="w-full h-full"
      />
      {(frameId === 'royal_vip' || frameId === 'seraph_crown') && (
        <span
          aria-hidden="true"
          className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-2 bg-amber-300 border border-white/80 rounded-t-sm rotate-45"
        />
      )}
    </div>
  );
};
