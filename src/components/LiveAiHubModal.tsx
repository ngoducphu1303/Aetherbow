import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bot,
  CheckCircle2,
  Cpu,
  Crown,
  Radio,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import { AI_COMPANION_ROLES, AI_TACTIC_CONFIGS } from '../engine/aiCombatBrain';
import { COOP_AI_ROLE_LIST, computeCoopRoleSynergy } from '../engine/wave6CombatSystems';
import {
  AI_DIFFICULTY_TIER_ORDER,
  AI_DIFFICULTY_TIERS,
  computeAdaptiveAiEscalation,
  normalizeAiDuelDifficultyTier,
} from '../engine/wave8LethalAiSystems';
import type { GuildWarBastionId } from '../engine/wave10FivePillars';
import {
  AI_SQUAD_FORMATION_LIST,
  normalizeAiSquadFormation,
} from '../engine/wave11FivePillars';
import { HERO_MAP } from '../data/heroesData';
import { liveAiSocket, LiveSocketStatus } from '../services/liveAiSocket';
import {
  acceptNemesisChallengeLetter,
  claimVirtualContractReward,
  confirmGuildWarBriefing,
  fetchVirtualContracts,
  generateVirtualContract,
  requestGuildWarBriefing,
  requestNemesisChallengeLetter,
  requestSpectatorCasting,
} from '../services/nvidiaVirtualPlayerClient';
import type {
  AiAutoPilotTactic,
  AiCompanionRole,
  AiDuelDifficultyTier,
  AiLiveHubSnapshot,
  AiLivePlayerProfile,
  AiPreferencesState,
  AiRivalRecord,
  CoopAiRole,
  HeroId,
  VirtualGuildWarBriefing,
  VirtualNemesisChallengeLetter,
  VirtualPlayerContract,
  VirtualSpectatorCastingBundle,
} from '../types/game';

interface LiveAiHubModalProps {
  playerDisplayName: string;
  playerHeroId?: HeroId;
  playerPowerRating?: number;
  currentChapterId?: number;
  aiPreferences: AiPreferencesState;
  coopPartyRoles?: [CoopAiRole, CoopAiRole];
  onUpdateAiPreferences: (next: AiPreferencesState) => void;
  onUpdateCoopPartyRoles?: (roles: [CoopAiRole, CoopAiRole]) => void;
  onChallengeAiPlayer: (opponent: AiLivePlayerProfile, duelId: string) => void;
  onStartMiniCupMatch?: (opponent: AiLivePlayerProfile, cupMatchId: string) => void;
  onClaimMiniCupPrize?: (reward: { rewardGold: number; rewardGems: number; titleLabel: string }) => void;
  onClaimServerBountyReward?: (reward: {
    rewardGold: number;
    rewardGems: number;
    rewardStarDust: number;
  }) => void;
  onStartGuildWarBastion?: (bastionId: GuildWarBastionId, bastionName: string) => void;
  onClaimGuildWarLiveReward?: (reward: {
    rewardGold: number;
    rewardGems: number;
    rewardGuildCoins: number;
    rewardStarDust: number;
  }) => void;
  onClaimSpectatorReward?: (reward: {
    goldReward: number;
    gemsReward: number;
    starDustReward: number;
    predictedCorrectly: boolean;
  }) => void;
  onClaimAiContractReward?: (reward: {
    goldReward: number;
    gemsReward: number;
    titleLabel: string;
  }) => void;
  onInspectAiPlayer?: (aiPlayerId: string) => void;
  onClose: () => void;
}

const STATUS_LABEL: Record<AiLivePlayerProfile['status'], { label: string; colorClass: string }> = {
  ready_duel: { label: 'Sẵn Sàng 1v1', colorClass: 'text-emerald-300' },
  campaign: { label: 'Đang Leo Ải', colorClass: 'text-sky-300' },
  weekly_practice: { label: 'Tập Boss Tuần', colorClass: 'text-amber-300' },
  lobby: { label: 'Đang Ở Sảnh', colorClass: 'text-slate-300' },
  in_duel: { label: 'Đang Đấu 1v1', colorClass: 'text-rose-300' },
};

const PERSONALITY_LABEL: Record<AiLivePlayerProfile['personality'], string> = {
  aggressive: 'Hung Hãn',
  tactical: 'Chiến Thuật',
  assassin: 'Sát Thủ',
};

function formatAgo(ts: number, nowMs: number): string {
  const sec = Math.max(1, Math.floor((nowMs - ts) / 1000));
  if (sec < 60) return `${sec}s trước`;
  const min = Math.floor(sec / 60);
  return `${min}p trước`;
}

export const LiveAiHubModal: React.FC<LiveAiHubModalProps> = ({
  playerDisplayName,
  playerHeroId = 'aurelia',
  playerPowerRating = 18500,
  currentChapterId = 1,
  aiPreferences,
  coopPartyRoles = ['dps', 'guardian'],
  onUpdateAiPreferences,
  onUpdateCoopPartyRoles,
  onChallengeAiPlayer,
  onStartMiniCupMatch,
  onClaimMiniCupPrize,
  onClaimServerBountyReward,
  onStartGuildWarBastion,
  onClaimGuildWarLiveReward,
  onClaimSpectatorReward,
  onClaimAiContractReward,
  onInspectAiPlayer,
  onClose,
}) => {
  const [snapshot, setSnapshot] = useState<AiLiveHubSnapshot | null>(() =>
    liveAiSocket.getSnapshot()
  );
  const [socketStatus, setSocketStatus] = useState<LiveSocketStatus>(() =>
    liveAiSocket.getStatus()
  );
  const [activeTab, setActiveTab] = useState<
    | 'players'
    | 'contracts'
    | 'spectator'
    | 'guild_war'
    | 'bounty'
    | 'cup'
    | 'rivals'
    | 'feed'
    | 'autopilot'
  >('players');
  const [filterMode, setFilterMode] = useState<'all' | 'ready_duel'>('all');
  const [challengingId, setChallengingId] = useState<string | null>(null);
  const [claimingBountyId, setClaimingBountyId] = useState<string | null>(null);
  const [claimingCupPrize, setClaimingCupPrize] = useState(false);
  const [claimingServerBounty, setClaimingServerBounty] = useState(false);
  const [claimingGuildWar, setClaimingGuildWar] = useState(false);
  const [claimingSpectator, setClaimingSpectator] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Phase 3 Living Virtual Character AI states
  const [nemesisLetter, setNemesisLetter] = useState<VirtualNemesisChallengeLetter | null>(null);
  const [nemesisLoading, setNemesisLoading] = useState(false);
  const [contracts, setContracts] = useState<VirtualPlayerContract[]>([]);
  const [contractBusy, setContractBusy] = useState(false);
  const [claimingContractId, setClaimingContractId] = useState<string | null>(null);
  const [spectatorCast, setSpectatorCast] = useState<VirtualSpectatorCastingBundle | null>(null);
  const [spectatorCastLoading, setSpectatorCastLoading] = useState(false);
  const [warRoomMode, setWarRoomMode] = useState<'guild_war' | 'guild_boss'>('guild_war');
  const [warBriefing, setWarBriefing] = useState<VirtualGuildWarBriefing | null>(null);
  const [warBriefingLoading, setWarBriefingLoading] = useState(false);

  const coopSynergy = useMemo(() => computeCoopRoleSynergy(coopPartyRoles), [coopPartyRoles]);
  const activeAiTier: AiDuelDifficultyTier = normalizeAiDuelDifficultyTier(
    aiPreferences.aiDuelTier
  );
  const activeTierCfg = AI_DIFFICULTY_TIERS[activeAiTier];
  const aiEscalation = useMemo(
    () => computeAdaptiveAiEscalation(aiPreferences.aiWinStreak ?? 0),
    [aiPreferences.aiWinStreak]
  );
  const pveChallengeOn = aiPreferences.pveChallengeEnabled ?? true;

  useEffect(() => {
    liveAiSocket.ensureConnected(playerDisplayName);
    liveAiSocket.syncMiniCup();
    liveAiSocket.syncServerBounty(playerDisplayName);
    const unsubSnap = liveAiSocket.subscribeSnapshot((next, status) => {
      setSnapshot(next);
      setSocketStatus(status);
    });
    const unsubDuel = liveAiSocket.subscribeDuelAccepted((accepted) => {
      setChallengingId(null);
      onChallengeAiPlayer(accepted.opponent, accepted.duelId);
    });
    const unsubBounty = liveAiSocket.subscribeRivalBountyAck((ack) => {
      setClaimingBountyId(null);
      setFeedback(ack.message);
    });
    const unsubCupPrize = liveAiSocket.subscribeMiniCupPrizeAck((ack) => {
      setClaimingCupPrize(false);
      setFeedback(ack.message);
      if (ack.ok && !ack.alreadyClaimed) {
        onClaimMiniCupPrize?.({
          rewardGold: ack.goldReward,
          rewardGems: ack.gemsReward,
          titleLabel: ack.titleLabel ?? 'Cúp 1v1 Tinh Giới',
        });
      }
    });
    const unsubServerBounty = liveAiSocket.subscribeServerBountyClaimAck((ack) => {
      setClaimingServerBounty(false);
      setFeedback(ack.message);
      if (ack.ok && !ack.alreadyClaimed) {
        onClaimServerBountyReward?.({
          rewardGold: ack.goldReward,
          rewardGems: ack.gemsReward,
          rewardStarDust: ack.starDustReward,
        });
      }
    });
    const unsubGuildWar = liveAiSocket.subscribeGuildWarClaimAck((ack) => {
      setClaimingGuildWar(false);
      setFeedback(ack.message);
      if (ack.ok && !ack.alreadyClaimed) {
        onClaimGuildWarLiveReward?.({
          rewardGold: ack.goldReward,
          rewardGems: ack.gemsReward,
          rewardGuildCoins: ack.guildCoinsReward,
          rewardStarDust: ack.starDustReward,
        });
      }
    });
    const unsubRevenge = liveAiSocket.subscribeRivalRevengeChallenge((evt) => {
      setFeedback(evt.invite.message);
    });
    const unsubSpecCheer = liveAiSocket.subscribeSpectatorCheerAck((ack) => {
      setFeedback(ack.message);
    });
    const unsubSpecClaim = liveAiSocket.subscribeSpectatorClaimAck((ack) => {
      setClaimingSpectator(false);
      setFeedback(ack.message);
      if (ack.ok && !ack.alreadyClaimed) {
        onClaimSpectatorReward?.({
          goldReward: ack.goldReward,
          gemsReward: ack.gemsReward,
          starDustReward: ack.starDustReward,
          predictedCorrectly: ack.predictedCorrectly,
        });
      }
    });
    liveAiSocket.syncGuildWar(playerDisplayName);
    liveAiSocket.syncSpectatorMatch(playerDisplayName);
    return () => {
      unsubSnap();
      unsubDuel();
      unsubBounty();
      unsubCupPrize();
      unsubServerBounty();
      unsubGuildWar();
      unsubRevenge();
      unsubSpecCheer();
      unsubSpecClaim();
    };
  }, [
    playerDisplayName,
    onChallengeAiPlayer,
    onClaimMiniCupPrize,
    onClaimServerBountyReward,
    onClaimGuildWarLiveReward,
    onClaimSpectatorReward,
  ]);

  // Phase 3: Sync contracts on modal open
  useEffect(() => {
    let active = true;
    fetchVirtualContracts(playerDisplayName).then((list) => {
      if (active) setContracts(list);
    });
    return () => {
      active = false;
    };
  }, [playerDisplayName]);

  // Phase 3: Sync Guild War-Room briefing when opening guild_war tab or switching warRoomMode
  useEffect(() => {
    if (activeTab !== 'guild_war') return;
    let active = true;
    setWarBriefingLoading(true);
    requestGuildWarBriefing({ playerName: playerDisplayName, mode: warRoomMode })
      .then((res) => {
        if (active) setWarBriefing(res);
      })
      .finally(() => {
        if (active) setWarBriefingLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeTab, warRoomMode, playerDisplayName]);

  // Phase 3: Sync Spectator AI Casting when match progresses or opens
  const specMatchId = snapshot?.spectatorMatch?.matchId ?? '';
  const specMatchStatus = snapshot?.spectatorMatch?.status ?? '';
  const specMatchTickBucket = snapshot?.spectatorMatch
    ? Math.floor(snapshot.spectatorMatch.tickCount / 4)
    : -1;
  useEffect(() => {
    if (activeTab !== 'spectator' || !snapshot?.spectatorMatch) return;
    const match = snapshot.spectatorMatch;
    let active = true;
    setSpectatorCastLoading(true);
    requestSpectatorCasting({
      playerName: playerDisplayName,
      matchId: match.matchId,
      fighterAName: match.fighterA.displayName,
      fighterAPower: match.fighterA.powerRating,
      fighterAHpPct: (match.fighterA.hp / Math.max(1, match.fighterA.maxHp)) * 100,
      fighterBName: match.fighterB.displayName,
      fighterBPower: match.fighterB.powerRating,
      fighterBHpPct: (match.fighterB.hp / Math.max(1, match.fighterB.maxHp)) * 100,
      winnerName:
        match.status === 'finished' && match.winnerId
          ? match.winnerId === match.fighterA.aiPlayerId
            ? match.fighterA.displayName
            : match.fighterB.displayName
          : undefined,
    })
      .then((bundle) => {
        if (active) setSpectatorCast(bundle);
      })
      .finally(() => {
        if (active) setSpectatorCastLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeTab, specMatchId, specMatchStatus, specMatchTickBucket, playerDisplayName]);

  const handleLoadNemesisLetter = async (aiPlayerId?: string, aiName?: string, forceRefresh = false) => {
    if (nemesisLoading) return;
    setNemesisLoading(true);
    try {
      const letter = await requestNemesisChallengeLetter({
        playerName: playerDisplayName,
        aiPlayerId,
        aiName,
        forceRefresh,
      });
      setNemesisLetter(letter);
    } finally {
      setNemesisLoading(false);
    }
  };

  const handleGenerateContract = async () => {
    if (contractBusy) return;
    setContractBusy(true);
    try {
      const res = await generateVirtualContract({
        playerName: playerDisplayName,
        chapterId: currentChapterId,
        playerPowerRating,
      });
      setContracts(res.contracts);
      if (res.ok && res.contract) {
        setFeedback(`Đã nhận kèo mới từ ${res.contract.aiName}: ${res.contract.titleVi}`);
      } else if (res.message) {
        setFeedback(res.message);
      }
    } finally {
      setContractBusy(false);
    }
  };

  const handleClaimContract = async (contract: VirtualPlayerContract) => {
    if (claimingContractId) return;
    setClaimingContractId(contract.id);
    try {
      const res = await claimVirtualContractReward({
        playerName: playerDisplayName,
        contractId: contract.id,
      });
      setContracts(res.contracts);
      setFeedback(res.message);
      if (res.ok && !res.alreadyClaimed) {
        onClaimAiContractReward?.({
          goldReward: res.goldReward,
          gemsReward: res.gemsReward,
          titleLabel: contract.titleVi,
        });
      }
    } finally {
      setClaimingContractId(null);
    }
  };

  const filteredPlayers = useMemo(() => {
    const list = snapshot?.players ?? [];
    if (filterMode === 'ready_duel') {
      return list.filter((p) => p.status === 'ready_duel');
    }
    return list;
  }, [snapshot?.players, filterMode]);

  const handleChallenge = (player: AiLivePlayerProfile) => {
    if (challengingId) return;
    setChallengingId(player.id);
    setFeedback(`Đang gửi lời thách đấu 1v1 tới ${player.displayName} ${player.tag}…`);
    const sent = liveAiSocket.challengeAiPlayer(player.id, playerDisplayName);
    if (!sent) {
      // Fallback local duelId if WebSocket is momentarily reconnecting
      const fallbackId = `local_duel_${Date.now()}`;
      setChallengingId(null);
      onChallengeAiPlayer(player, fallbackId);
    }
  };

  const toggleSquadRole = (role: AiCompanionRole) => {
    const exists = aiPreferences.squadRoles.includes(role);
    let nextRoles: AiCompanionRole[];
    if (exists) {
      if (aiPreferences.squadRoles.length <= 1) return; // keep at least 1 role selected
      nextRoles = aiPreferences.squadRoles.filter((r) => r !== role);
    } else {
      nextRoles = [...aiPreferences.squadRoles, role].slice(-2);
    }
    onUpdateAiPreferences({ ...aiPreferences, squadRoles: nextRoles });
  };

  const isConnected = socketStatus === 'connected';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5 bg-[#040611]/92 overflow-y-auto">
      <div className="cel-panel-ornate w-full max-w-4xl rounded-3xl p-5 sm:p-7 my-auto max-h-[92vh] overflow-y-auto text-left space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-sky-400/20">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-300">
              <Radio className="w-4 h-4 shrink-0" />
              <span>Hệ Sinh Thái Người Chơi AI Real-Time</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span
                className={`inline-flex items-center gap-1.5 font-mono-nums ${
                  isConnected ? 'text-emerald-300' : 'text-amber-300'
                }`}
              >
                {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                <span>
                  {isConnected
                    ? 'WebSocket Trực Tuyến'
                    : socketStatus === 'reconnecting'
                    ? 'Đang kết nối lại…'
                    : 'Đang kết nối…'}
                </span>
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-[26px] font-black text-white mt-1 leading-tight">
              Trung Tâm Người Chơi AI &amp; Đấu Trường 1v1 Live
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Mọi đối thủ AI được gắn nhãn rõ <strong className="text-sky-200">[AI Live]</strong>, chạy trực tuyến trên máy chủ WebSocket và phản xạ 60Hz trong trận 3D.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng Trung Tâm Người Chơi AI"
            className="a2-slate-btn p-2.5 rounded-xl cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Strip (Zero-Pill, Tabular) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-slate-800/80">
          <div>
            <div className="text-[11px] text-slate-400 font-semibold">Người Chơi AI Trực Tuyến</div>
            <div className="font-mono-nums text-base font-black text-sky-300 mt-0.5">
              {snapshot?.onlineAiCount ?? 18} [AI Live]
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold">Chiến Binh Đang Kết Nối</div>
            <div className="font-mono-nums text-base font-black text-emerald-300 mt-0.5">
              {snapshot?.onlineHumanCount ?? 1} trực tuyến
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold">Thành Tích 1v1 Live</div>
            <div className="font-mono-nums text-base font-black text-amber-300 mt-0.5">
              {aiPreferences.liveDuelWins}T - {aiPreferences.liveDuelLosses}B
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold">Điểm Đấu Trường Live</div>
            <div className="font-mono-nums text-base font-black text-white mt-0.5">
              {aiPreferences.liveDuelRating.toLocaleString('vi-VN')} điểm
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1 bg-[#060a18] border border-sky-400/20 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setActiveTab('players')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'players'
                  ? 'bg-sky-400/20 text-sky-200'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              AI Live ({snapshot?.players.length ?? 0})
            </button>
            <button
              type="button"
              data-testid="hub-tab-contracts"
              onClick={() => setActiveTab('contracts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'contracts'
                  ? 'bg-amber-400/25 text-amber-200'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Kèo Riêng ({contracts.filter((c) => c.status !== 'claimed').length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('spectator');
                liveAiSocket.syncSpectatorMatch(playerDisplayName);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
                activeTab === 'spectator'
                  ? 'bg-purple-500/25 text-purple-200'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5 shrink-0" />
              <span>Khán Đài AI</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('guild_war');
                liveAiSocket.syncGuildWar(playerDisplayName);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
                activeTab === 'guild_war'
                  ? 'bg-amber-500/25 text-amber-200'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>Chiến Trường Bang</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('bounty');
                liveAiSocket.syncServerBounty(playerDisplayName);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
                activeTab === 'bounty'
                  ? 'bg-emerald-500/25 text-emerald-200'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Truy Nã Server</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cup')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
                activeTab === 'cup'
                  ? 'bg-amber-400/25 text-amber-200'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 shrink-0" />
              <span>Cúp 1v1 (8)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rivals')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'rivals'
                  ? 'bg-rose-500/25 text-amber-200'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Truyền Kiếp ({snapshot?.rivals?.length ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('feed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'feed'
                  ? 'bg-sky-400/20 text-sky-200'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Bảng Tin ({snapshot?.activities.length ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('autopilot')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'autopilot'
                  ? 'bg-amber-400/20 text-amber-200'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              AI &amp; Đồng Đội 3D
            </button>
          </div>

          {activeTab === 'players' && (
            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap cursor-pointer border ${
                  filterMode === 'all'
                    ? 'border-sky-400/50 bg-sky-500/15 text-sky-200'
                    : 'border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('ready_duel')}
                className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap cursor-pointer border ${
                  filterMode === 'ready_duel'
                    ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
                    : 'border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                Sẵn sàng 1v1
              </button>
            </div>
          )}
        </div>

        {feedback && (
          <div className="rounded-xl border border-sky-400/40 bg-sky-950/50 px-4 py-2.5 text-xs text-sky-200 flex items-center gap-2">
            <Activity className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Wave 8: Lethal AI Difficulty Tier Selector & Adaptive Escalation Strip */}
        {activeTab === 'players' && (
          <div className="rounded-2xl border border-rose-400/30 bg-[#080d20] p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-black text-white">
                <Swords className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Cấp Độ AI Thực Chiến (Đấu 1v1 &amp; Thử Thách)</span>
              </div>
              <div className="text-[11px] font-mono-nums text-amber-300">
                Thích nghi AI: <strong className="text-rose-300">{aiEscalation.threatLabel}</strong>
                {aiEscalation.winStreak > 0 ? ` (Chuỗi ${aiEscalation.winStreak}T)` : ''}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {AI_DIFFICULTY_TIER_ORDER.map((tierId) => {
                const cfg = AI_DIFFICULTY_TIERS[tierId];
                const selected = activeAiTier === tierId;
                return (
                  <button
                    key={tierId}
                    type="button"
                    onClick={() =>
                      onUpdateAiPreferences({
                        ...aiPreferences,
                        aiDuelTier: tierId,
                      })
                    }
                    className={`text-left px-3 py-2 rounded-xl border transition-colors cursor-pointer ${
                      selected
                        ? 'border-rose-400/80 bg-rose-500/18 text-white'
                        : 'border-slate-800 bg-slate-950/75 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-xs font-black">
                      <span className={selected ? 'text-white' : cfg.accentClass}>{cfg.label}</span>
                      {cfg.rewardBonusPct > 0 && (
                        <span className="font-mono-nums text-[10px] text-emerald-300">
                          +{cfg.rewardBonusPct}%
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 font-mono-nums">
                      ST {Math.round(cfg.baseHitMaxHpPct * 100)}% HP · Né {cfg.dashCooldownSec}s
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
              <span className="text-slate-300">{activeTierCfg.tagline}</span>
              <label className="inline-flex items-center gap-2 text-slate-200 font-semibold cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={pveChallengeOn}
                  onChange={(e) =>
                    onUpdateAiPreferences({
                      ...aiPreferences,
                      pveChallengeEnabled: e.target.checked,
                    })
                  }
                  className="w-3.5 h-3.5 accent-rose-400 cursor-pointer"
                />
                <span>Áp dụng AI khó cho Chiến Dịch &amp; Boss PvE</span>
              </label>
            </div>
          </div>
        )}

        {/* TAB 1: Live AI Players Directory & 1v1 Challenges */}
        {activeTab === 'players' && (
          <div className="divide-y divide-slate-800/80 border-y border-slate-800/80 max-h-[40vh] overflow-y-auto">
            {filteredPlayers.map((p) => {
              const st = STATUS_LABEL[p.status];
              const heroName = HERO_MAP[p.heroId]?.name ?? 'Aurelia';
              const busy = challengingId === p.id;
              return (
                <div
                  key={p.id}
                  className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                      <Bot className="w-4 h-4 text-sky-300 shrink-0" />
                      {onInspectAiPlayer ? (
                        <button
                          type="button"
                          onClick={() => onInspectAiPlayer(p.id)}
                          className="truncate text-sky-200 hover:text-amber-300 underline decoration-sky-400/40 underline-offset-2 cursor-pointer"
                        >
                          {p.displayName}
                        </button>
                      ) : (
                        <span className="truncate">{p.displayName}</span>
                      )}
                      <span className="text-[11px] font-mono-nums font-bold text-sky-300 shrink-0">
                        {p.tag}
                      </span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className={`text-xs font-bold shrink-0 ${st.colorClass}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span>Tướng {heroName}</span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span>Lối đánh {PERSONALITY_LABEL[p.personality]}</span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="font-mono-nums text-amber-200">
                        LC {p.powerRating.toLocaleString('vi-VN')}
                      </span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="font-mono-nums text-slate-400">
                        Hạng 1v1: {p.duelRating} ({p.duelWins}T-{p.duelLosses}B)
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">{p.statusDetail}</div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onInspectAiPlayer && (
                      <button
                        type="button"
                        onClick={() => onInspectAiPlayer(p.id)}
                        className="a2-slate-btn px-3 py-2 rounded-xl text-xs font-bold text-sky-200 border border-sky-400/35 hover:border-amber-300/60 cursor-pointer whitespace-nowrap"
                      >
                        Hồ Sơ
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleChallenge(p)}
                      className="a2-yellow-btn px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
                    >
                      <Swords className="w-3.5 h-3.5" />
                      <span>{busy ? 'Đang vào sân…' : 'Thách Đấu 1v1'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 1A: Live 8-Player 1v1 Mini-Cup Knockout Bracket (Wave 6 Pillar 5) */}
        {activeTab === 'cup' && (
          <div className="space-y-4">
            {(() => {
              const cup = snapshot?.miniCup ?? null;
              if (!cup) {
                return (
                  <div className="rounded-2xl border border-amber-400/35 bg-[#080d22] p-6 text-center space-y-3">
                    <Crown className="w-8 h-8 text-amber-300 mx-auto" />
                    <h3 className="font-display text-lg font-black text-white">
                      Cúp Loại Trực Tiếp 1v1 (Bạn + 7 Cao Thủ [AI Live])
                    </h3>
                    <p className="text-xs text-slate-300 max-w-lg mx-auto">
                      Thi đấu 3 vòng liên tiếp (Tứ Kết → Bán Kết → Chung Kết) theo nhánh đấu trực tuyến trên máy chủ. Các cặp AI ở nhánh khác tự giao đấu song song sau mỗi vòng!
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        liveAiSocket.startMiniCup({
                          playerName: playerDisplayName,
                          heroId: playerHeroId,
                          powerRating: playerPowerRating,
                          duelRating: aiPreferences.liveDuelRating,
                        });
                        setFeedback('Đang bốc thăm nhánh đấu Cúp 1v1 8 Người…');
                      }}
                      className="a2-yellow-btn px-5 py-2.5 rounded-xl text-xs font-black inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Trophy className="w-4 h-4" />
                      <span>Khởi Tạo Giải Đấu Cúp 1v1 Ngay</span>
                    </button>
                  </div>
                );
              }

              const activeMatch = cup.matches.find(
                (m) =>
                  m.status === 'ready' &&
                  m.round === cup.currentRound &&
                  (m.fighterA?.isHuman || m.fighterB?.isHuman)
              );
              const nextOpponentSlot = activeMatch
                ? activeMatch.fighterA?.isHuman
                  ? activeMatch.fighterB
                  : activeMatch.fighterA
                : null;
              const nextOpponentProfile = nextOpponentSlot
                ? snapshot?.players.find((p) => p.id === nextOpponentSlot.id) ?? null
                : null;

              const roundMeta = [
                { round: 1 as const, title: 'Tứ Kết (8 → 4)' },
                { round: 2 as const, title: 'Bán Kết (4 → 2)' },
                { round: 3 as const, title: 'Chung Kết (Vô Địch)' },
              ];

              return (
                <>
                  <div className="rounded-2xl border border-amber-400/35 bg-[#080d22] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-[11px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5" />
                        <span>{cup.rewardTitleLabel ?? 'Cúp Loại Trực Tiếp 1v1 (8 Người)'}</span>
                      </div>
                      <div className="text-sm font-black text-white">
                        {cup.status === 'champion'
                          ? 'CHÚC MỪNG! Bạn đã đăng quang Quán Quân Cúp 1v1!'
                          : cup.status === 'eliminated'
                          ? 'Hành trình dừng bước — bạn vẫn nhận thưởng tham dự!'
                          : nextOpponentSlot
                          ? `Vòng ${cup.currentRound}/3 · Đối thủ tiếp theo: ${nextOpponentSlot.displayName} [AI Live]`
                          : `Đang ở Vòng ${cup.currentRound}/3`}
                      </div>
                      <div className="text-[11px] font-mono-nums tabular-nums text-emerald-300">
                        Quỹ thưởng giải đấu: +{cup.rewardGems} Ngọc · +{cup.rewardGold.toLocaleString('vi-VN')} Vàng
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {cup.status === 'active' && activeMatch && nextOpponentProfile && onStartMiniCupMatch && (
                        <button
                          type="button"
                          onClick={() => onStartMiniCupMatch(nextOpponentProfile, activeMatch.matchId)}
                          className="a2-yellow-btn px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <Swords className="w-4 h-4" />
                          <span>Vào Trận Vòng {cup.currentRound}</span>
                        </button>
                      )}

                      {(cup.status === 'champion' || cup.status === 'eliminated') && !cup.prizeClaimed && (
                        <button
                          type="button"
                          disabled={claimingCupPrize}
                          onClick={() => {
                            setClaimingCupPrize(true);
                            liveAiSocket.claimMiniCupPrize(cup.cupId, playerDisplayName);
                          }}
                          className="a2-emerald-btn px-4 py-2.5 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap disabled:opacity-50"
                        >
                          {claimingCupPrize ? 'Đang phát thưởng…' : 'Nhận Thưởng Giải Đấu'}
                        </button>
                      )}

                      {(cup.status === 'champion' || cup.status === 'eliminated') && (
                        <button
                          type="button"
                          onClick={() => {
                            liveAiSocket.startMiniCup({
                              playerName: playerDisplayName,
                              heroId: playerHeroId,
                              powerRating: playerPowerRating,
                              duelRating: aiPreferences.liveDuelRating,
                            });
                            setFeedback('Đã mở mùa Cúp 1v1 mới với 7 đối thủ [AI Live]!');
                          }}
                          className="a2-slate-btn px-3.5 py-2.5 rounded-xl text-xs font-bold text-sky-200 border border-sky-400/40 cursor-pointer whitespace-nowrap"
                        >
                          Mở Cúp Mới
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 3-Round Bracket Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {roundMeta.map((rm) => {
                      const matches = cup.matches.filter((m) => m.round === rm.round);
                      return (
                        <div key={rm.round} className="space-y-2">
                          <div className="text-[11px] font-black uppercase tracking-wider text-amber-200">
                            {rm.title}
                          </div>
                          <div className="space-y-2">
                            {matches.map((m) => {
                              const isPlayerMatch =
                                Boolean(m.fighterA?.isHuman) || Boolean(m.fighterB?.isHuman);
                              return (
                                <div
                                  key={m.matchId}
                                  className={`rounded-xl p-2.5 border text-xs space-y-1.5 ${
                                    isPlayerMatch && m.status === 'ready'
                                      ? 'bg-amber-500/12 border-amber-300/70'
                                      : 'bg-[#070b1a] border-slate-800'
                                  }`}
                                >
                                  {[m.fighterA, m.fighterB].map((slot, sIdx) => {
                                    const won = slot && m.winnerId === slot.id;
                                    return (
                                      <div
                                        key={`${m.matchId}-${sIdx}`}
                                        className={`flex items-center justify-between gap-2 px-2 py-1 rounded-lg ${
                                          won
                                            ? 'bg-emerald-500/15 text-emerald-200 font-black'
                                            : slot?.isHuman
                                            ? 'bg-amber-400/10 text-amber-200 font-bold'
                                            : 'text-slate-300'
                                        }`}
                                      >
                                        <span className="truncate">
                                          {slot ? (
                                            <>
                                              <span className="font-mono-nums text-[10px] text-slate-500 mr-1">
                                                {slot.duelRating}
                                              </span>
                                              {slot.displayName}
                                              {!slot.isHuman && (
                                                <span className="ml-1 text-[9px] text-sky-300">
                                                  [AI Live]
                                                </span>
                                              )}
                                            </>
                                          ) : (
                                            <span className="text-slate-500">Chờ nhánh trước…</span>
                                          )}
                                        </span>
                                        {won && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* TAB 1A: Phase 3 Pillar 2 — Dynamic Virtual Player Contracts */}
        {activeTab === 'contracts' && (
          <div className="space-y-4" data-testid="hub-contracts-panel">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-display text-base font-black text-white">
                  Kèo Thách Đấu &amp; Ủy Thác Từ 18 Cao Thủ
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Nhân vật ảo tự giao kèo sát Chương {currentChapterId} ({playerPowerRating.toLocaleString('vi-VN')} LC). Giữ tối đa 3 kèo cùng lúc, thưởng Vàng, Ngọc và điểm Thân Thiết.
                </p>
              </div>
              <button
                type="button"
                data-testid="hub-generate-contract-btn"
                disabled={contractBusy || contracts.filter((c) => c.status === 'active').length >= 3}
                onClick={handleGenerateContract}
                className="a2-yellow-btn px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              >
                {contractBusy ? 'Đang tạo kèo…' : 'Xin Kèo Mới'}
              </button>
            </div>

            {contracts.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-slate-700/80 rounded-2xl space-y-2">
                <p className="text-xs text-slate-300">
                  Bạn chưa nhận kèo riêng nào từ các cao thủ AI.
                </p>
                <button
                  type="button"
                  disabled={contractBusy}
                  onClick={handleGenerateContract}
                  className="a2-slate-btn px-4 py-2 rounded-xl text-xs font-bold text-amber-200 border border-amber-400/40 cursor-pointer"
                >
                  Nhận Kèo Đầu Tiên
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto a2-scroll">
                {contracts.map((c) => {
                  const pct = Math.min(100, Math.round((c.currentCount / Math.max(1, c.targetCount)) * 100));
                  const statusLabel =
                    c.status === 'claimed'
                      ? 'Đã nhận thưởng'
                      : c.status === 'completed'
                      ? 'Hoàn thành'
                      : 'Đang thực hiện';
                  const statusColor =
                    c.status === 'claimed'
                      ? 'text-slate-400'
                      : c.status === 'completed'
                      ? 'text-emerald-300'
                      : 'text-amber-300';
                  return (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-slate-800 bg-[#070b1a] p-4 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 space-y-0.5">
                          <div className="text-xs text-slate-400 flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-sky-300">{c.aiName}</span>
                            <span aria-hidden="true">·</span>
                            <span>{c.aiTitle}</span>
                            <span aria-hidden="true">·</span>
                            <span className={`font-bold ${statusColor}`}>{statusLabel}</span>
                          </div>
                          <div className="font-display text-sm font-black text-white">
                            {c.titleVi}
                          </div>
                          <p className="text-xs text-slate-200 leading-relaxed">
                            &ldquo;{c.pitchVi}&rdquo;
                          </p>
                        </div>
                        {c.status === 'completed' && (
                          <button
                            type="button"
                            disabled={claimingContractId === c.id}
                            onClick={() => handleClaimContract(c)}
                            className="a2-emerald-btn px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer shrink-0 disabled:opacity-50"
                          >
                            {claimingContractId === c.id ? 'Đang nhận…' : 'Nhận Thưởng'}
                          </button>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-mono-nums">
                          <span className="text-slate-300">{c.objectiveLabelVi}</span>
                          <span className="font-bold text-amber-200">
                            {c.currentCount}/{c.targetCount} ({pct}%)
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-[11px] font-mono-nums text-slate-400 flex flex-wrap items-center gap-2">
                        <span className="text-amber-300 font-bold">
                          +{c.rewardGold.toLocaleString('vi-VN')} Vàng
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-cyan-300 font-bold">+{c.rewardGems} Ngọc</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-300 font-bold">
                          +{c.rewardAffinity} Thân Thiết
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 1B: Persistent Rival / Nemesis System */}
        {activeTab === 'rivals' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-300">
                Các đối thủ <strong className="text-sky-200">[AI Live]</strong> bạn từng giao đấu 1v1 sẽ lưu lịch sử Thắng–Thua vĩnh viễn và tự học lối đánh để gửi Chiến Thư khắc chế!
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  data-testid="rival-read-letter-btn"
                  disabled={nemesisLoading}
                  onClick={() => {
                    const top = snapshot?.rivals?.[0];
                    handleLoadNemesisLetter(top?.aiPlayerId, top?.aiDisplayName, true);
                  }}
                  className="a2-slate-btn px-3 py-1.5 rounded-xl text-[11px] font-bold text-amber-200 border border-amber-400/45 whitespace-nowrap cursor-pointer disabled:opacity-50"
                >
                  {nemesisLoading ? 'Đang phân tích…' : 'Đọc Chiến Thư AI'}
                </button>
                {(snapshot?.rivals ?? []).length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      liveAiSocket.requestRivalRevenge(undefined, playerDisplayName);
                      setFeedback('Đang gọi Kình Địch gửi chiến thư phục thù…');
                    }}
                    className="a2-slate-btn px-3 py-1.5 rounded-xl text-[11px] font-bold text-rose-200 border border-rose-400/45 whitespace-nowrap cursor-pointer"
                  >
                    Khiêu Khích Kình Địch
                  </button>
                )}
              </div>
            </div>

            {/* Phase 3 Pillar 1: Nemesis Challenge Letter & Counter-Tactic Card */}
            {nemesisLetter && (
              <div
                data-testid="rival-nemesis-letter-card"
                className="rounded-2xl border border-rose-500/40 bg-[#140914] p-4 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-slate-300 flex flex-wrap items-center gap-1.5">
                    <span className="font-black text-rose-300">Chiến Thư Truyền Kiếp</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-bold text-white">{nemesisLetter.aiName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-300 font-bold">
                      Khắc chế: {nemesisLetter.counterLabelVi}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await acceptNemesisChallengeLetter({
                        playerName: playerDisplayName,
                        aiPlayerId: nemesisLetter.aiPlayerId,
                      });
                      const aiTarget =
                        snapshot?.players.find((p) => p.id === nemesisLetter.aiPlayerId) ??
                        snapshot?.players[0];
                      if (aiTarget) {
                        handleChallenge(aiTarget);
                      } else {
                        setFeedback(`Đã nhận Chiến Thư từ ${nemesisLetter.aiName}!`);
                      }
                    }}
                    className="a2-yellow-btn px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer"
                  >
                    Nhận Chiến Thư &amp; Tái Đấu
                  </button>
                </div>
                <p className="text-xs text-slate-100 leading-relaxed">
                  &ldquo;{nemesisLetter.letterVi}&rdquo;
                </p>
                <div className="text-[11px] text-cyan-200 pt-1 border-t border-rose-500/20">
                  <span className="font-bold text-cyan-300">Mẹo phá giải:</span>{' '}
                  {nemesisLetter.counterHintVi}
                </div>
              </div>
            )}

            {(snapshot?.rivals ?? []).length === 0 ? (
              <div className="py-10 text-center border border-dashed border-slate-700/80 rounded-2xl text-xs text-slate-400">
                Chưa có lịch sử Truyền Kiếp nào. Hãy chọn một chiến binh [AI Live] ở tab AI Live và bấm Thách Đấu 1v1, hoặc bấm &ldquo;Đọc Chiến Thư AI&rdquo; để nhận lời khiêu chiến mở màn!
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80 border-y border-slate-800/80 max-h-[44vh] overflow-y-auto">
                {(snapshot?.rivals ?? []).map((r: AiRivalRecord) => {
                  const aiProfile = snapshot?.players.find((p) => p.id === r.aiPlayerId);
                  const todayKey = new Date(snapshot?.serverNow ?? Date.now()).toISOString().slice(0, 10);
                  const dailyClaimed = r.bountyClaimedDateKey === todayKey;
                  const canClaimBounty = r.winsAgainst > 0 && !dailyClaimed;
                  const vendettaPending = Boolean(r.vendettaPending);
                  const revengeBonusPct = r.revengeBonusPct ?? 0;
                  const revengeStreak = r.revengeStreak ?? 0;
                  const tierLabel =
                    r.rivalryTier === 'nemesis'
                      ? 'Truyền Kiếp'
                      : r.rivalryTier === 'archrival'
                      ? 'Kỳ Phùng Địch Thủ'
                      : 'Đối Thủ Cân Tài';
                  const tierColor =
                    r.rivalryTier === 'nemesis'
                      ? 'text-rose-300'
                      : r.rivalryTier === 'archrival'
                      ? 'text-amber-300'
                      : 'text-sky-300';
                  return (
                    <div
                      key={r.aiPlayerId}
                      className={`py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        vendettaPending ? 'bg-rose-950/20' : ''
                      }`}
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-white">
                          <span className={tierColor}>{tierLabel}</span>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          {onInspectAiPlayer ? (
                            <button
                              type="button"
                              onClick={() => onInspectAiPlayer(r.aiPlayerId)}
                              className="truncate text-sky-200 hover:text-amber-300 underline decoration-sky-400/40 underline-offset-2 cursor-pointer"
                            >
                              {r.aiDisplayName}
                            </button>
                          ) : (
                            <span className="truncate">{r.aiDisplayName}</span>
                          )}
                          {vendettaPending && (
                            <span className="text-[10px] font-black text-rose-300 font-mono-nums">
                              · Phục Thù +{revengeBonusPct}% Thưởng
                            </span>
                          )}
                          {!vendettaPending && revengeStreak > 0 && (
                            <span className="text-[10px] font-bold text-amber-300 font-mono-nums">
                              · Chuỗi Kình Địch ×{revengeStreak}
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-mono-nums text-slate-300">
                          Tỷ số của bạn:{' '}
                          <strong className="text-emerald-300">{r.winsAgainst} Thắng</strong> –{' '}
                          <strong className="text-rose-300">{r.lossesAgainst} Thua</strong> · {r.lastEncounterReason} ({formatAgo(r.lastEncounterAt, snapshot?.serverNow ?? Date.now())})
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {canClaimBounty ? (
                          <button
                            type="button"
                            disabled={claimingBountyId === r.aiPlayerId}
                            onClick={() => {
                              setClaimingBountyId(r.aiPlayerId);
                              liveAiSocket.claimRivalBounty(r.aiPlayerId);
                            }}
                            className="a2-emerald-btn px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer disabled:opacity-50"
                          >
                            {claimingBountyId === r.aiPlayerId ? 'Đang nhận…' : 'Nhận Thưởng Đòi Nợ'}
                          </button>
                        ) : dailyClaimed ? (
                          <span className="text-[11px] font-bold text-emerald-300 whitespace-nowrap">
                            Đã nhận thưởng hôm nay
                          </span>
                        ) : null}
                        {aiProfile && (
                          <button
                            type="button"
                            disabled={challengingId === aiProfile.id}
                            onClick={() => handleChallenge(aiProfile)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50 ${
                              vendettaPending ? 'bg-gradient-to-r from-rose-500 to-amber-400 text-slate-950' : 'a2-yellow-btn'
                            }`}
                          >
                            <Swords className="w-3.5 h-3.5" />
                            <span>{vendettaPending ? `Chấp Nhận Phục Thù (+${revengeBonusPct}%)` : 'Tái Đấu 1v1'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* WAVE 7 TAB: Server-Authoritative Live Server-Wide Bounty Board */}
        {activeTab === 'bounty' && (() => {
          const bounty = snapshot?.serverBounty;
          if (!bounty) {
            return (
              <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-700/80 rounded-2xl">
                Đang đồng bộ Lệnh Truy Nã Toàn Server qua WebSocket…
              </div>
            );
          }
          const pct = Math.max(
            0,
            Math.min(100, Math.round((bounty.currentPoints / Math.max(1, bounty.targetPoints)) * 100))
          );
          const readyToClaim = bounty.completed || bounty.currentPoints >= bounty.targetPoints;
          return (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-400/30 bg-[#060d1c] p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 shrink-0" />
                      <span>Hợp Lực Toàn Server · Ngày {bounty.dateKey}</span>
                    </div>
                    <h3 className="font-display text-lg font-black text-white mt-0.5">
                      {bounty.title}
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">{bounty.subtitle}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-semibold text-slate-400">
                      Rương Thưởng Toàn Server
                    </div>
                    <div className="font-mono-nums tabular-nums text-xs font-black text-amber-300 mt-0.5">
                      +{bounty.rewardGold.toLocaleString('vi-VN')} Vàng · +{bounty.rewardGems} Ngọc · +
                      {bounty.rewardStarDust} Bụi Tinh Tú
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="text-slate-200">{bounty.objectiveLabel}</span>
                    <span className="font-mono-nums tabular-nums text-emerald-300">
                      {bounty.currentPoints.toLocaleString('vi-VN')} /{' '}
                      {bounty.targetPoints.toLocaleString('vi-VN')} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-950 border border-emerald-400/35 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-300 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const ok = liveAiSocket.contributeServerBounty({
                        playerName: playerDisplayName,
                        heroId: playerHeroId,
                        points: 120,
                        sourceLabel: 'Chi viện Sảnh',
                      });
                      setFeedback(
                        ok
                          ? 'Đã gửi +120 Chiến Tích vào Lệnh Truy Nã Toàn Server!'
                          : 'WebSocket đang kết nối lại — vui lòng thử lại sau giây lát.'
                      );
                    }}
                    className="a2-yellow-btn px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Zap className="w-3.5 h-3.5 shrink-0" />
                    <span>Góp Chiến Tích (+120)</span>
                  </button>

                  <button
                    type="button"
                    disabled={!readyToClaim || bounty.claimedByPlayer || claimingServerBounty}
                    onClick={() => {
                      setClaimingServerBounty(true);
                      liveAiSocket.claimServerBountyReward(bounty.bountyId, playerDisplayName);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      bounty.claimedByPlayer
                        ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 cursor-default'
                        : readyToClaim
                        ? 'a2-emerald-btn'
                        : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {bounty.claimedByPlayer
                        ? 'Đã Nhận Rương Hôm Nay'
                        : readyToClaim
                        ? 'Nhận Rương Truy Nã Server'
                        : 'Chưa Đủ Mốc Toàn Server'}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-300 mb-2">
                  Bảng Đóng Góp Thực Chiến ({bounty.contributors.length} chiến binh)
                </div>
                <div className="divide-y divide-slate-800/80 border-y border-slate-800/80 max-h-[34vh] overflow-y-auto">
                  {bounty.contributors.map((c, idx) => (
                    <div
                      key={c.id}
                      className={`py-2 px-2.5 flex items-center justify-between gap-3 text-xs ${
                        c.isHuman ? 'bg-amber-400/10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono-nums font-black text-slate-400 w-6 shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-white truncate">
                          {c.displayName}
                          {c.isHuman ? ' (Bạn)' : ''}
                        </span>
                        <span className="text-[11px] text-slate-400 shrink-0">
                          · {HERO_MAP[c.heroId]?.name ?? c.heroId}
                        </span>
                      </div>
                      <span className="font-mono-nums tabular-nums font-black text-emerald-300 shrink-0">
                        +{c.points.toLocaleString('vi-VN')} Chiến Tích
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB 2: Real-Time World Activity Feed */}
        {activeTab === 'feed' && (
          <div className="divide-y divide-slate-800/80 border-y border-slate-800/80 max-h-[46vh] overflow-y-auto">
            {(snapshot?.activities ?? []).map((ev) => {
              const colorMap = {
                amber: 'text-amber-300',
                sky: 'text-sky-300',
                emerald: 'text-emerald-300',
                rose: 'text-rose-300',
              };
              return (
                <div key={ev.id} className="py-2.5 px-2 flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <span className={`font-bold ${colorMap[ev.accent]}`}>{ev.actorName}</span>{' '}
                    <span className="text-slate-200">{ev.summary}</span>
                  </div>
                  <span className="font-mono-nums text-[11px] text-slate-400 shrink-0">
                    {formatAgo(ev.timestamp, snapshot?.serverNow ?? Date.now())}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: AI Auto-Pilot & 3D AI Squad Companion Settings */}
        {activeTab === 'autopilot' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Auto-Pilot Configuration */}
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-amber-200 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-300" />
                  <span>AI Tự Chơi 1 Chạm (Auto-Pilot 60Hz)</span>
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateAiPreferences({
                      ...aiPreferences,
                      autoPilotEnabled: !aiPreferences.autoPilotEnabled,
                    })
                  }
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black cursor-pointer whitespace-nowrap border ${
                    aiPreferences.autoPilotEnabled
                      ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                      : 'border-slate-700 bg-slate-900 text-slate-300'
                  }`}
                >
                  {aiPreferences.autoPilotEnabled ? 'Đang Bật Mặc Định' : 'Đang Tắt Mặc Định'}
                </button>
              </div>

              <div className="space-y-2">
                {(['aggressive', 'balanced', 'evasive'] as AiAutoPilotTactic[]).map((tId) => {
                  const cfg = AI_TACTIC_CONFIGS[tId];
                  const selected = aiPreferences.tactic === tId;
                  return (
                    <button
                      key={tId}
                      type="button"
                      onClick={() => onUpdateAiPreferences({ ...aiPreferences, tactic: tId })}
                      className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                        selected
                          ? 'border-amber-400/70 bg-amber-400/12'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-white">
                        <span>Chiến Thuật: {cfg.label}</span>
                        {selected && <CheckCircle2 className="w-4 h-4 text-amber-300" />}
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1">{cfg.description}</p>
                    </button>
                  );
                })}
              </div>

              <label className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/80 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-white">Tự Chọn Kỹ Năng Thông Minh (2.5s)</div>
                  <div className="text-[11px] text-slate-400">
                    Ưu tiên Tiến Hóa &amp; Cộng Hưởng; bạn luôn có thể bấm chọn tay trước khi hết 2.5s.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={aiPreferences.autoSkillPick}
                  onChange={(e) =>
                    onUpdateAiPreferences({
                      ...aiPreferences,
                      autoSkillPick: e.target.checked,
                    })
                  }
                  className="w-4 h-4 accent-amber-400 cursor-pointer"
                />
              </label>

              <p className="text-[11px] text-slate-400">
                Lưu ý Công Bằng: AI Tự Chơi &amp; Đồng Đội AI bị khóa tự động trong lượt Boss Tuần Tính Hạng chính thức (mở bình thường ở Chiến Dịch, Tháp, Tập Boss Tuần).
              </p>
            </div>

            {/* 3D AI Squad Companion Configuration */}
            <div className="lg:col-span-6 lg:pl-6 lg:border-l lg:border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-sky-200 flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-300" />
                  <span>Đồng Đội AI 3D Thực Chiến (Tối đa 2)</span>
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateAiPreferences({
                      ...aiPreferences,
                      squadAssistEnabled: !aiPreferences.squadAssistEnabled,
                    })
                  }
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black cursor-pointer whitespace-nowrap border ${
                    aiPreferences.squadAssistEnabled
                      ? 'border-sky-400/60 bg-sky-500/20 text-sky-200'
                      : 'border-slate-700 bg-slate-900 text-slate-300'
                  }`}
                >
                  {aiPreferences.squadAssistEnabled ? 'Đang Triển Khai Đội' : 'Tắt Hỗ Trợ Đội'}
                </button>
              </div>

              <div className="space-y-2.5">
                {(['vanguard', 'ranger', 'mystic'] as AiCompanionRole[]).map((roleId) => {
                  const cfg = AI_COMPANION_ROLES[roleId];
                  const active = aiPreferences.squadRoles.includes(roleId);
                  return (
                    <button
                      key={roleId}
                      type="button"
                      onClick={() => toggleSquadRole(roleId)}
                      className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                        active
                          ? 'border-sky-400/70 bg-sky-400/12'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-white">
                        <span className="flex items-center gap-2">
                          {roleId === 'vanguard' ? (
                            <Shield className="w-3.5 h-3.5 text-sky-300" />
                          ) : roleId === 'ranger' ? (
                            <Zap className="w-3.5 h-3.5 text-amber-300" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                          )}
                          <span>{cfg.name}</span>
                          <span className="text-[11px] font-semibold text-slate-400">
                            · {cfg.roleLabel}
                          </span>
                        </span>
                        {active && <CheckCircle2 className="w-4 h-4 text-sky-300" />}
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1">{cfg.description}</p>
                    </button>
                  );
                })}
              </div>

              {/* Wave 11 Pillar 5: Tactical AI Squad Formation Selector */}
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-sky-200">
                    Đội Hình Chiến Thuật Tổ Đội AI (Phím 4 · 5 · 6)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {AI_SQUAD_FORMATION_LIST.map((fm, idx) => {
                    const activeFormation = normalizeAiSquadFormation(aiPreferences.squadFormation);
                    const isSelected = activeFormation === fm.id;
                    const hotkey = 4 + idx;
                    return (
                      <button
                        key={fm.id}
                        type="button"
                        onClick={() =>
                          onUpdateAiPreferences({
                            ...aiPreferences,
                            squadFormation: fm.id,
                          })
                        }
                        className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-sky-300 bg-sky-500/18 text-white'
                            : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-black">
                          <span>
                            [{hotkey}] {fm.name}
                          </span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-sky-300 shrink-0" />}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                          {fm.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Wave 6 Pillar 5: Co-op 3D AI Party Role Presets & Live Team Synergy */}
              {onUpdateCoopPartyRoles && (
                <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-amber-200">
                      Vai Trò Tổ Đội Co-op 3D (2 Đồng Đội AI)
                    </span>
                    <span className="text-[11px] font-bold text-emerald-300">
                      {coopSynergy.teamBadge}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {([0, 1] as const).map((slotIdx) => (
                      <div
                        key={slotIdx}
                        className="rounded-xl bg-[#070b1a] border border-slate-800 p-2 space-y-1.5"
                      >
                        <div className="text-[10px] font-bold text-slate-400">
                          Vị Trí AI #{slotIdx + 1}
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {COOP_AI_ROLE_LIST.map((roleDef) => {
                            const selected = coopPartyRoles[slotIdx] === roleDef.id;
                            return (
                              <button
                                key={roleDef.id}
                                type="button"
                                onClick={() => {
                                  const next: [CoopAiRole, CoopAiRole] = [
                                    coopPartyRoles[0],
                                    coopPartyRoles[1],
                                  ];
                                  next[slotIdx] = roleDef.id;
                                  onUpdateCoopPartyRoles(next);
                                }}
                                className={`py-1 px-1.5 rounded-lg text-[10px] font-black cursor-pointer border whitespace-nowrap ${
                                  selected
                                    ? 'bg-amber-400/20 border-amber-300/75 text-amber-200'
                                    : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                {roleDef.shortLabel}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] font-mono-nums tabular-nums text-slate-300">
                    Hiệu ứng cộng hưởng: +{Math.round(coopSynergy.bossDamageBonus * 100)}% ST Boss ·{' '}
                    -{Math.round(coopSynergy.enemyProjectileSlowPct * 100)}% Tốc Đạn Địch · +
                    {Math.round(coopSynergy.damageReductionBonus * 100)}% Giảm Thương
                    {coopSynergy.periodicHealPct > 0
                      ? ` · Hồi ${Math.round(coopSynergy.periodicHealPct * 100)}% Máu/8s`
                      : ''}
                  </div>
                </div>
              )}

              {/* Wave 10 Pillar 5A: Adaptive AI Playstyle Learning Telemetry */}
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-rose-200">
                    Hồ Sơ AI Học Lối Đánh Người Chơi
                  </span>
                  {snapshot?.adaptationProfile && (
                    <button
                      type="button"
                      onClick={() => {
                        liveAiSocket.resetAiAdaptation(playerDisplayName);
                        setFeedback('Đã đặt lại dữ liệu học lối đánh AI.');
                      }}
                      className="px-2 py-0.5 rounded-lg border border-slate-700 text-[10px] font-bold text-slate-300 hover:text-white cursor-pointer"
                    >
                      Đặt Lại Học AI
                    </button>
                  )}
                </div>
                {snapshot?.adaptationProfile ? (
                  <div className="rounded-xl bg-[#090d20] border border-rose-400/35 p-3 space-y-1.5 text-[11px]">
                    <div className="flex flex-wrap items-center justify-between gap-2 font-bold">
                      <span className="text-amber-200">
                        {snapshot.adaptationProfile.counterInsightLabel}
                      </span>
                      <span className="font-mono-nums text-sky-300">
                        {snapshot.adaptationProfile.samplesAnalyzed} trận phân tích
                      </span>
                    </div>
                    <div className="text-slate-300 font-mono-nums">
                      Cự ly TB: {snapshot.adaptationProfile.avgEngageDistance.toFixed(1)}m · Né:{' '}
                      {snapshot.adaptationProfile.dodgeBias === 'left'
                        ? 'Hay né Trái'
                        : snapshot.adaptationProfile.dodgeBias === 'right'
                        ? 'Hay né Phải'
                        : 'Cân bằng'}
                    </div>
                    <div className="text-emerald-300 font-semibold">
                      {snapshot.adaptationProfile.coopSynergyHint}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-[#070b1a] border border-slate-800 p-2.5 text-[11px] text-slate-400">
                    Sau mỗi trận 1v1 hoặc Co-op, AI server tự ghi nhận hướng né, cự ly giữ khoảng và nguyên tố chủ lực của bạn để thích nghi đối kháng &amp; tự bồi nguyên tố Hợp Kích.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: WAVE 10 PILLAR 5B — REAL-TIME 3-BASTION GUILD WAR BATTLEFIELD */}
        {activeTab === 'guild_war' && (() => {
          const war = snapshot?.guildWarLive;
          if (!war) {
            return (
              <div className="p-6 text-center text-xs text-slate-400">
                Đang đồng bộ Chiến Trường Bang Hội Real-Time từ server...
              </div>
            );
          }
          const zodiacPct = Math.min(100, Math.round((war.zodiacScore / Math.max(1, war.targetScore)) * 100));
          const rivalPct = Math.min(100, Math.round((war.rivalScore / Math.max(1, war.targetScore)) * 100));
          const canClaimWar =
            !war.claimedByPlayer &&
            (war.status !== 'active' || war.zodiacScore >= 600);

          return (
            <div className="space-y-4">
              {/* Phase 3 Pillar 5: AI Guild War-Room Coordinator */}
              <div
                data-testid="guild-war-room-briefing"
                className="rounded-2xl border border-cyan-400/35 bg-[#071122] p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="text-xs text-slate-300 flex flex-wrap items-center gap-1.5">
                      <span className="font-black text-cyan-300">Hội Đồng Chiến Thuật Bang Hội</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-amber-200 font-bold">
                        Chỉ huy: {warBriefing?.leaderName ?? 'Thủ Lĩnh Bang'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-300 font-mono-nums font-bold">
                        {warBriefing?.confirmedByPlayer
                          ? 'Đã kích hoạt +8% Cống Hiến'
                          : 'Thưởng phối hợp +8%'}
                      </span>
                    </div>
                    <p className="text-xs text-white leading-relaxed">
                      {warBriefingLoading
                        ? 'Hội Đồng Bang đang phân tích mặt trận thực tế…'
                        : warBriefing?.briefingVi ??
                          'Xác nhận Chiến Lệnh Bang để đồng bộ mục tiêu ưu tiên và nhận thưởng cống hiến.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 bg-[#050914] border border-slate-800 rounded-xl p-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setWarRoomMode('guild_war')}
                        className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap cursor-pointer ${
                          warRoomMode === 'guild_war'
                            ? 'bg-amber-400/20 text-amber-200'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Công Thành
                      </button>
                      <button
                        type="button"
                        onClick={() => setWarRoomMode('guild_boss')}
                        className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap cursor-pointer ${
                          warRoomMode === 'guild_boss'
                            ? 'bg-cyan-400/20 text-cyan-200'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Boss Bang
                      </button>
                    </div>
                    {warBriefing && (
                      <button
                        type="button"
                        data-testid="guild-war-confirm-order-btn"
                        disabled={warBriefing.confirmedByPlayer}
                        onClick={async () => {
                          const updated = await confirmGuildWarBriefing({
                            playerName: playerDisplayName,
                            mode: warBriefing.mode,
                            sessionId: warBriefing.sessionId,
                          });
                          if (updated) {
                            setWarBriefing(updated);
                            setFeedback(
                              `Đã xác nhận Chiến Lệnh Bang (+8% cống hiến vào ${updated.priorityTargetName})!`
                            );
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer ${
                          warBriefing.confirmedByPlayer
                            ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 cursor-default'
                            : 'a2-emerald-btn'
                        }`}
                      >
                        {warBriefing.confirmedByPlayer ? 'Đã Xác Nhận (+8%)' : 'Xác Nhận Chiến Lệnh'}
                      </button>
                    )}
                  </div>
                </div>

                {warBriefing && warBriefing.roleOrders.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800/80">
                    {warBriefing.roleOrders.map((ro, idx) => (
                      <div
                        key={`${ro.memberName}_${idx}`}
                        className="rounded-xl bg-[#050914] border border-slate-800/90 p-2.5 space-y-0.5"
                      >
                        <div className="text-[11px] font-bold text-white flex items-center justify-between gap-1">
                          <span className="truncate">{ro.memberName}</span>
                          <span className="text-[10px] text-amber-300 shrink-0">{ro.roleLabelVi}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug">{ro.dutyVi}</p>
                      </div>
                    ))}
                  </div>
                )}

                {warBriefing?.mvpSummaryVi && (
                  <div className="text-[11px] text-slate-300">
                    <span className="font-bold text-amber-300">Tổng kết MVP:</span>{' '}
                    {warBriefing.mvpSummaryVi}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-amber-400/35 bg-[#080d22] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-black text-amber-200">
                      Chiến Trường Bang Hội Real-Time (3 Pháo Đài · [AI Live] Tham Chiến)
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Chiếm giữ Tháp Thái Dương, Thành Cổ Tinh Giới &amp; Đền Hư Không để cán mốc {war.targetScore.toLocaleString('vi-VN')} điểm trước Hắc Ám!
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!canClaimWar || claimingGuildWar}
                    onClick={() => {
                      setClaimingGuildWar(true);
                      liveAiSocket.claimGuildWarReward(war.warId, playerDisplayName);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer ${
                      war.claimedByPlayer
                        ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 cursor-default'
                        : canClaimWar
                        ? 'a2-emerald-btn'
                        : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {war.claimedByPlayer
                      ? 'Đã Nhận Rương Hôm Nay'
                      : claimingGuildWar
                      ? 'Đang Nhận...'
                      : `Nhận Rương Bang (${war.rewardGems} Ngọc)`}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono-nums">
                  <div className="rounded-xl bg-[#071521] border border-emerald-400/40 p-2.5">
                    <div className="flex items-center justify-between font-black text-emerald-200 mb-1">
                      <span>{war.zodiacGuildName} (Ta)</span>
                      <span>
                        {war.zodiacScore}/{war.targetScore} ({zodiacPct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-950 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-300 transition-all"
                        style={{ width: `${zodiacPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#1b0915] border border-rose-400/40 p-2.5">
                    <div className="flex items-center justify-between font-black text-rose-200 mb-1">
                      <span>{war.rivalGuildName}</span>
                      <span>
                        {war.rivalScore}/{war.targetScore} ({rivalPct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-950 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-rose-600 to-amber-400 transition-all"
                        style={{ width: `${rivalPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {war.bastions.map((b) => {
                  const controlPct = Math.round(((b.controlScore + 100) / 200) * 100);
                  const ownerLabel =
                    b.owner === 'zodiac_guild'
                      ? 'Hoàng Đạo Giữ'
                      : b.owner === 'dark_alliance'
                      ? 'Hắc Ám Giữ'
                      : 'Đang Tranh Chấp';
                  const ownerColor =
                    b.owner === 'zodiac_guild'
                      ? 'text-emerald-300'
                      : b.owner === 'dark_alliance'
                      ? 'text-rose-300'
                      : 'text-amber-300';

                  return (
                    <div
                      key={b.id}
                      className="rounded-2xl border border-amber-400/30 bg-[#070b1a] p-3.5 flex flex-col justify-between gap-2.5"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display text-sm font-black text-white">
                            {b.name}
                          </span>
                          <span className={`text-[10px] font-black ${ownerColor}`}>
                            {ownerLabel}
                          </span>
                        </div>
                        <div className="text-[11px] text-amber-200 font-bold">{b.bonusLabel}</div>
                        <div className="text-[10px] font-mono-nums text-slate-400">
                          {b.allyAiCount} AI Đồng Minh vs {b.enemyAiCount} AI Địch · Điểm kiểm soát {b.controlScore > 0 ? `+${b.controlScore}` : b.controlScore}
                        </div>
                        <div className="h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden mt-1">
                          <div
                            className="h-full bg-gradient-to-r from-rose-500 via-amber-300 to-emerald-400 transition-all"
                            style={{ width: `${controlPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (onStartGuildWarBastion) {
                              onClose();
                              onStartGuildWarBastion(b.id, b.name);
                            }
                          }}
                          className="a2-yellow-btn py-2 px-2 rounded-xl text-[11px] font-black cursor-pointer whitespace-nowrap"
                        >
                          Xung Kích 3D
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            liveAiSocket.strikeGuildWarBastion({
                              bastionId: b.id,
                              mode: 'quick_strike',
                              heroId: playerHeroId,
                              playerName: playerDisplayName,
                            });
                            setFeedback(`Đã tung Chi Viện Nhanh vào ${b.name}!`);
                          }}
                          className="a2-slate-btn py-2 px-2 rounded-xl text-[11px] font-black text-sky-200 border border-sky-400/40 hover:border-amber-300 cursor-pointer whitespace-nowrap"
                        >
                          Chi Viện Nhanh
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* TAB 8: Wave 11 Pillar 5 — Real-Time AI Championship Spectator Arena */}
        {activeTab === 'spectator' && (() => {
          const match = snapshot?.spectatorMatch;
          if (!match) {
            return (
              <div className="rounded-2xl border border-purple-400/30 bg-[#070b1a] p-5 text-center space-y-3">
                <div className="text-sm font-black text-purple-200">
                  Đang kết nối Khán Đài AI Đấu Giải Trực Tiếp…
                </div>
                <button
                  type="button"
                  onClick={() => liveAiSocket.syncSpectatorMatch(playerDisplayName)}
                  className="a2-purple-btn px-4 py-2 rounded-xl text-xs font-black cursor-pointer"
                >
                  Tải Trận Đang Diễn Ra
                </button>
              </div>
            );
          }

          const renderFighterCard = (f: typeof match.fighterA, side: 'A' | 'B') => {
            const hpPct = Math.max(0, Math.min(100, (f.hp / Math.max(1, f.maxHp)) * 100));
            const isCheered = match.playerCheeredFighterId === f.aiPlayerId;
            const isWinner = match.status === 'finished' && match.winnerId === f.aiPlayerId;
            const hero = HERO_MAP[f.heroId] ?? HERO_MAP.aurelia;
            const accent = side === 'A' ? 'border-sky-400/50' : 'border-rose-400/50';
            return (
              <div
                className={`rounded-2xl border p-4 bg-[#070b1a] space-y-3 ${
                  isWinner ? 'border-amber-300 ring-1 ring-amber-300/60' : accent
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {side === 'A' ? 'Góc Tinh Lam (A)' : 'Góc Huyết Viêm (B)'} · {hero.name}
                    </div>
                    <div className="font-display text-base font-black text-white mt-0.5">
                      {f.displayName}
                    </div>
                    <div className="text-[11px] font-mono-nums text-amber-300 font-bold">
                      {PERSONALITY_LABEL[f.personality]} · {f.powerRating.toLocaleString('vi-VN')} LC
                    </div>
                  </div>
                  <div className="text-right font-mono-nums">
                    <div className="text-xs font-black text-purple-300">
                      Hạng {f.styleGrade}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Khí Thế {f.momentum}%
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono-nums mb-1">
                    <span className="text-slate-300 font-bold">
                      HP {f.hp.toLocaleString('vi-VN')} / {f.maxHp.toLocaleString('vi-VN')}
                    </span>
                    <span className="text-emerald-300 font-black">{Math.round(hpPct)}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        side === 'A'
                          ? 'bg-gradient-to-r from-sky-500 to-cyan-300'
                          : 'bg-gradient-to-r from-rose-600 to-amber-400'
                      }`}
                      style={{ width: `${hpPct}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-nums text-slate-300">
                  <span>
                    Tổng ST: {f.damageDealt.toLocaleString('vi-VN')} · CM: {f.critsLanded} · Né: {f.dodgesLanded}
                  </span>
                  <span className="text-amber-300 font-bold">
                    {f.cheersCount} cổ vũ
                  </span>
                </div>

                <button
                  type="button"
                  disabled={match.status !== 'live' || isCheered}
                  onClick={() => {
                    liveAiSocket.cheerSpectatorFighter({
                      matchId: match.matchId,
                      fighterId: f.aiPlayerId,
                      playerName: playerDisplayName,
                    });
                  }}
                  className={`w-full py-2 rounded-xl text-xs font-black cursor-pointer disabled:cursor-not-allowed transition-colors ${
                    isCheered
                      ? 'bg-emerald-500/20 border border-emerald-400/60 text-emerald-200'
                      : match.status === 'live'
                      ? side === 'A'
                        ? 'a2-slate-btn border border-sky-400/60 text-sky-200 hover:border-amber-300'
                        : 'a2-slate-btn border border-rose-400/60 text-rose-200 hover:border-amber-300'
                      : 'bg-slate-900 border border-slate-800 text-slate-500'
                  }`}
                >
                  {isWinner
                    ? 'CHIẾN THẮNG TRẬN NÀY'
                    : isCheered
                    ? `Đang Cổ Vũ ${f.displayName}`
                    : `Cổ Vũ ${f.displayName} (Miễn Phí)`}
                </button>
              </div>
            );
          };

          const winnerName =
            match.winnerId === match.fighterA.aiPlayerId
              ? match.fighterA.displayName
              : match.fighterB.displayName;
          const predictedCorrectly =
            Boolean(match.playerCheeredFighterId) && match.playerCheeredFighterId === match.winnerId;

          return (
            <div className="space-y-4">
              <div className="rounded-2xl border border-purple-400/40 bg-[#0d0a24] p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black text-purple-300 uppercase tracking-wider">
                    {match.roundLabel} · Khán Đài AI Đấu Giải Real-Time
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Server mô phỏng trực tiếp AI vs AI theo thời gian thực — cổ vũ miễn phí cho tuyển thủ bạn chọn để nhận Vàng, Bụi Sao &amp; Ngọc Hồn khi trận kết thúc!
                  </p>
                </div>
                <div className="flex items-center gap-2 font-mono-nums">
                  <span className="px-3 py-1.5 rounded-xl bg-[#070b1a] border border-purple-400/35 text-xs font-black text-amber-200">
                    {match.status === 'live'
                      ? `Đang Đấu · Hiệp ${match.tickCount}/${match.maxTicks}`
                      : `Kết Thúc · Hiệp ${match.tickCount}/${match.maxTicks}`}
                  </span>
                  {match.status === 'finished' && (
                    <button
                      type="button"
                      onClick={() => liveAiSocket.requestNextSpectatorMatch(playerDisplayName)}
                      className="a2-slate-btn px-3 py-1.5 rounded-xl text-xs font-black text-sky-200 border border-sky-400/45 cursor-pointer whitespace-nowrap"
                    >
                      Trận Kế Tiếp
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {renderFighterCard(match.fighterA, 'A')}
                {renderFighterCard(match.fighterB, 'B')}
              </div>

              {match.status === 'finished' && (
                <div className="rounded-2xl border border-amber-400/50 bg-[#171206] p-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-black text-amber-300">
                      Trận Đấu Đã Phân Định — Thắng Cuộc: {winnerName}
                    </div>
                    <div className="text-[11px] text-slate-300">
                      {match.playerCheeredFighterId
                        ? predictedCorrectly
                          ? 'Dự đoán CHÍNH XÁC! Bạn nhận 100% phần thưởng Khán Đài AI.'
                          : 'Bạn vẫn nhận 50% thưởng cổ vũ tham gia từ Khán Đài AI.'
                        : 'Cổ vũ trận tiếp theo khi đang thi đấu để nhận thưởng Khán Đài AI.'}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={
                      Boolean(match.playerClaimedReward) ||
                      !match.playerCheeredFighterId ||
                      claimingSpectator
                    }
                    onClick={() => {
                      setClaimingSpectator(true);
                      liveAiSocket.claimSpectatorReward(match.matchId, playerDisplayName);
                    }}
                    className="a2-yellow-btn px-4 py-2 rounded-xl text-xs font-black cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {match.playerClaimedReward
                      ? 'Đã Nhận Thưởng Trận Này'
                      : claimingSpectator
                      ? 'Đang Nhận…'
                      : 'Nhận Thưởng Cổ Vũ'}
                  </button>
                </div>
              )}

              {/* Phase 3 Pillar 3: Live AI Spectator Casting & Pre-Match Scouting */}
              <div
                data-testid="spectator-ai-casting-panel"
                className="rounded-2xl border border-cyan-400/35 bg-[#061121] p-3.5 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-black text-cyan-300">Bình Luận Viên AI Trực Tiếp</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-amber-200 font-bold">
                      Cửa trên: {spectatorCast?.favoredFighterName ?? match.fighterA.displayName}
                    </span>
                  </div>
                  {spectatorCastLoading && (
                    <span className="text-[11px] text-slate-400">Đang cập nhật bình luận…</span>
                  )}
                </div>
                {spectatorCast?.scoutingSummaryVi && (
                  <p className="text-xs text-slate-200 leading-snug">
                    <span className="font-bold text-amber-300">Soi kèo:</span>{' '}
                    {spectatorCast.scoutingSummaryVi}
                  </p>
                )}
                {spectatorCast && spectatorCast.lines.length > 0 && (
                  <div className="space-y-1 pt-1.5 border-t border-slate-800/80">
                    {spectatorCast.lines.map((cl) => (
                      <div key={cl.id} className="text-xs text-cyan-100 leading-snug">
                        <span className="font-bold text-cyan-300">{cl.speakerName}:</span>{' '}
                        {cl.textVi}
                      </div>
                    ))}
                  </div>
                )}
                {spectatorCast?.postMatchQuoteVi && match.status === 'finished' && (
                  <div className="text-xs text-amber-200 pt-1.5 border-t border-slate-800/80">
                    <span className="font-bold text-amber-300">Phát biểu sau trận:</span>{' '}
                    {spectatorCast.postMatchQuoteVi}
                  </div>
                )}
              </div>

              {/* Live Match Play-by-Play Ticker */}
              <div className="rounded-2xl border border-slate-800 bg-[#060917] p-3.5 space-y-2">
                <div className="text-[11px] font-black text-sky-300 uppercase tracking-wider">
                  Tường Thuật Trực Tiếp Server
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto a2-scroll">
                  {match.tickerLog.map((line) => (
                    <div
                      key={line.id}
                      className={`text-xs flex items-start justify-between gap-2 px-2.5 py-1.5 rounded-lg border ${
                        line.accent === 'amber'
                          ? 'bg-amber-400/10 border-amber-400/35 text-amber-100'
                          : line.accent === 'rose'
                          ? 'bg-rose-500/10 border-rose-400/35 text-rose-100'
                          : 'bg-[#090f22] border-slate-800/80 text-slate-200'
                      }`}
                    >
                      <span>{line.text}</span>
                      <span className="font-mono-nums text-[10px] text-slate-400 shrink-0">
                        H{line.tick}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
