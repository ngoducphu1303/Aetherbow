import type { HudSnapshot } from '../types/game';

export const COOP_ULT_WINDOW_SEC = 4.0;
export const COOP_RESONANCE_DURATION_SEC = 5.0;
export const COOP_RESONANCE_BONUS_PCT = 25;

export interface CoopSynergyClock {
  windowRemainingSec: number;
  windowAllyName: string | null;
  playerUltRecentRemainingSec: number;
  resonanceRemainingSec: number;
  calloutText: string | null;
  calloutTimerSec: number;
  totalResonancesTriggered: number;
}

export function createCoopSynergyClock(): CoopSynergyClock {
  return {
    windowRemainingSec: 0,
    windowAllyName: null,
    playerUltRecentRemainingSec: 0,
    resonanceRemainingSec: 0,
    calloutText: null,
    calloutTimerSec: 0,
    totalResonancesTriggered: 0,
  };
}

export function onCoopAllyUltimateCast(
  clock: CoopSynergyClock,
  allyName: string
): { triggeredResonance: boolean } {
  if (clock.playerUltRecentRemainingSec > 0) {
    clock.playerUltRecentRemainingSec = 0;
    clock.windowRemainingSec = 0;
    clock.resonanceRemainingSec = COOP_RESONANCE_DURATION_SEC;
    clock.totalResonancesTriggered += 1;
    clock.calloutText = `CỘNG HƯỞNG LIÊN KÍCH cùng ${allyName} · +${COOP_RESONANCE_BONUS_PCT}% ST Boss (5s)!`;
    clock.calloutTimerSec = 3.2;
    return { triggeredResonance: true };
  }
  clock.windowRemainingSec = COOP_ULT_WINDOW_SEC;
  clock.windowAllyName = allyName;
  clock.calloutText = `${allyName} vừa tung Tuyệt Kỹ — Bấm Q trong 4s để kích hoạt Liên Kích +${COOP_RESONANCE_BONUS_PCT}% ST!`;
  clock.calloutTimerSec = 3.5;
  return { triggeredResonance: false };
}

export function onPlayerUltimateCastInCoop(
  clock: CoopSynergyClock
): { triggeredResonance: boolean; partnerName: string | null } {
  if (clock.windowRemainingSec > 0 && clock.windowAllyName) {
    const partner = clock.windowAllyName;
    clock.windowRemainingSec = 0;
    clock.playerUltRecentRemainingSec = 0;
    clock.resonanceRemainingSec = COOP_RESONANCE_DURATION_SEC;
    clock.totalResonancesTriggered += 1;
    clock.calloutText = `CỘNG HƯỞNG LIÊN KÍCH cùng ${partner} · +${COOP_RESONANCE_BONUS_PCT}% ST Boss (5s)!`;
    clock.calloutTimerSec = 3.2;
    return { triggeredResonance: true, partnerName: partner };
  }
  clock.playerUltRecentRemainingSec = COOP_ULT_WINDOW_SEC;
  return { triggeredResonance: false, partnerName: null };
}

/**
 * Deterministic fixed-timestep update (call with FIXED_SIM_DT = 1/60s).
 * Guarantees 12 / 30 / 60 FPS bit-for-bit parity.
 */
export function stepCoopSynergyClock(clock: CoopSynergyClock, dt: number): void {
  if (clock.windowRemainingSec > 0) {
    clock.windowRemainingSec = Math.max(0, clock.windowRemainingSec - dt);
    if (clock.windowRemainingSec === 0) {
      clock.windowAllyName = null;
    }
  }
  if (clock.playerUltRecentRemainingSec > 0) {
    clock.playerUltRecentRemainingSec = Math.max(0, clock.playerUltRecentRemainingSec - dt);
  }
  if (clock.resonanceRemainingSec > 0) {
    clock.resonanceRemainingSec = Math.max(0, clock.resonanceRemainingSec - dt);
  }
  if (clock.calloutTimerSec > 0) {
    clock.calloutTimerSec = Math.max(0, clock.calloutTimerSec - dt);
    if (clock.calloutTimerSec === 0) {
      clock.calloutText = null;
    }
  }
}

export function getCoopResonanceDamageMult(clock: CoopSynergyClock): number {
  return clock.resonanceRemainingSec > 0 ? 1 + COOP_RESONANCE_BONUS_PCT / 100 : 1;
}

export function toHudCoopSynergy(
  clock: CoopSynergyClock,
  alliesUltReady: string[]
): NonNullable<HudSnapshot['coopSynergy']> {
  return {
    resonanceRemainingSec: Number(clock.resonanceRemainingSec.toFixed(2)),
    resonanceBonusPct: COOP_RESONANCE_BONUS_PCT,
    windowRemainingSec: Number(clock.windowRemainingSec.toFixed(2)),
    windowAllyName: clock.windowAllyName,
    calloutText: clock.calloutText,
    alliesUltReady,
  };
}

export function mapBossTelegraphToHud(params: {
  telegraphType: 'none' | 'shot' | 'lunge' | 'slam' | 'spiral' | 'lane';
  telegraphTimer: number;
  telegraphDuration: number;
  bossPhase: 1 | 2 | 3;
}): HudSnapshot['activeBossTelegraph'] {
  if (params.telegraphType === 'none' || params.telegraphTimer <= 0.02) {
    return null;
  }
  const durationSec = Math.max(0.25, params.telegraphDuration);
  const remainingSec = Math.max(0, Math.min(durationSec, params.telegraphTimer));

  if (params.telegraphType === 'slam') {
    return {
      kind: 'slam',
      label: 'Đập Trời Chấn Động',
      actionHint: 'Né Ra Ngoài Vòng Đỏ!',
      remainingSec: Number(remainingSec.toFixed(2)),
      durationSec: Number(durationSec.toFixed(2)),
      dangerLevel: 'critical',
    };
  }
  if (params.telegraphType === 'lunge' || params.telegraphType === 'lane') {
    return {
      kind: 'charge',
      label: params.telegraphType === 'lane' ? 'Xung Kích Tuyến Thẳng' : 'Lao Tới Hủy Diệt',
      actionHint: 'Lướt Ngang Né Hoàn Hảo!',
      remainingSec: Number(remainingSec.toFixed(2)),
      durationSec: Number(durationSec.toFixed(2)),
      dangerLevel: 'critical',
    };
  }
  if (params.telegraphType === 'spiral') {
    return {
      kind: 'barrage',
      label: 'Bão Đạn Tinh Giới',
      actionHint: 'Giữ Cự Ly & Luồn Khe Đạn!',
      remainingSec: Number(remainingSec.toFixed(2)),
      durationSec: Number(durationSec.toFixed(2)),
      dangerLevel: params.bossPhase >= 2 ? 'critical' : 'high',
    };
  }
  return {
    kind: 'sweep',
    label: 'Quét Vòng Tụ Lực',
    actionHint: 'Né Đúng Nhịp Phản Đòn!',
    remainingSec: Number(remainingSec.toFixed(2)),
    durationSec: Number(durationSec.toFixed(2)),
    dangerLevel: 'high',
  };
}
