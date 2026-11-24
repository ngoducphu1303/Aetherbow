import React, { useEffect, useMemo, useState } from 'react';
import { Gavel, PackageCheck, RefreshCw, Tag, Timer, X } from 'lucide-react';
import celestialAuctionArt from '../assets/images/celestial_auction_hall_1795005956822.jpg';
import { soundEngine } from '../audio/soundEngine';
import { GEAR_TEMPLATES, RARITY_META } from '../data/gearData';
import {
  SOCKET_GEM_META,
  getSocketGemLabel,
  getSocketGemTierRoman,
  normalizeSocketGems,
} from '../data/wave5Data';
import { normalizeAuctionHouse } from '../data/wave7Data';
import { liveAiSocket } from '../services/liveAiSocket';
import {
  AiLiveAuctionBidEvent,
  AiLivePlayerProfile,
  AuctionLotItem,
  GearInstance,
  Rarity,
  SaveData,
  SocketGemInstance,
} from '../types/game';
import {
  GearSlotSvg,
  RARITY_FRAME_CLASS,
  SoulGemIcon,
} from './GameIcons';

interface AuctionHouseModalProps {
  save: SaveData;
  onPlaceBid: (lotId: string, bidAmount: number) => void;
  onBuyoutLot: (lotId: string) => void;
  onListGear: (gearUid: string, startBid: number, buyoutPrice: number) => void;
  onListGem: (gemUid: string, startBid: number, buyoutPrice: number) => void;
  onCancelListing: (lotId: string) => void;
  onClaimAll: () => void;
  onClaimEntry: (entryId: string) => void;
  onRefreshLots: () => void;
  onClose: () => void;
}

function formatCountdown(msLeft: number): string {
  if (msLeft <= 0) return '00:00';
  const totalSec = Math.ceil(msLeft / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getSuggestedGearPricing(rarity: Rarity): { start: number; buyout: number } {
  switch (rarity) {
    case Rarity.MYTHIC:
      return { start: 95, buyout: 155 };
    case Rarity.LEGENDARY:
      return { start: 60, buyout: 98 };
    case Rarity.EPIC:
      return { start: 32, buyout: 54 };
    case Rarity.RARE:
      return { start: 18, buyout: 30 };
    default:
      return { start: 10, buyout: 18 };
  }
}

export const AuctionHouseModal: React.FC<AuctionHouseModalProps> = ({
  save,
  onPlaceBid,
  onBuyoutLot,
  onListGear,
  onListGem,
  onCancelListing,
  onClaimAll,
  onClaimEntry,
  onRefreshLots,
  onClose,
}) => {
  const [tab, setTab] = useState<'market' | 'consign' | 'claims'>('market');
  const [imgErr, setImgErr] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [selectedConsignKey, setSelectedConsignKey] = useState<string>('');
  const [customStartBid, setCustomStartBid] = useState<number>(25);
  const [customBuyout, setCustomBuyout] = useState<number>(45);
  const [aiPlayers, setAiPlayers] = useState<AiLivePlayerProfile[]>(
    () => liveAiSocket.getSnapshot()?.players ?? []
  );
  const [liveBidEvents, setLiveBidEvents] = useState<AiLiveAuctionBidEvent[]>(
    () => liveAiSocket.getRecentAuctionEvents()
  );

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const ah = useMemo(() => normalizeAuctionHouse(save.auctionHouse, now), [save.auctionHouse, now]);
  const activeLots = ah.lots.filter((l) => l.status === 'active');
  const marketLots = activeLots.filter((l) => !l.isPlayerListing);
  const playerListings = activeLots.filter((l) => l.isPlayerListing);

  useEffect(() => {
    liveAiSocket.ensureConnected();
    const unsubSnap = liveAiSocket.subscribeSnapshot((snap) => {
      setAiPlayers(snap.players);
    });
    const unsubAuc = liveAiSocket.subscribeAuctionEvents((evt) => {
      setLiveBidEvents((prev) => [evt, ...prev.filter((e) => e.eventId !== evt.eventId)].slice(0, 6));
    });
    return () => {
      unsubSnap();
      unsubAuc();
    };
  }, []);

  useEffect(() => {
    const syncPayload = activeLots.map((lot) => ({
      id: lot.id,
      label: lot.label,
      currentBid: lot.currentBid,
      buyoutPrice: lot.buyoutPrice,
      highestBidderIsPlayer: lot.highestBidderIsPlayer,
      isPlayerListing: Boolean(lot.isPlayerListing),
      endsAt: lot.endsAt,
    }));
    liveAiSocket.syncAuctionLots(syncPayload);
  }, [activeLots]);

  const equippedUids = useMemo(() => new Set(Object.values(save.equipped)), [save.equipped]);
  const socketedGemUids = useMemo(() => {
    const set = new Set<string>();
    save.inventory.forEach((g) => g.socketedGems?.forEach((id) => set.add(id)));
    return set;
  }, [save.inventory]);

  const listableGears = useMemo<GearInstance[]>(
    () =>
      save.inventory.filter(
        (g) => !equippedUids.has(g.uid) && !(g.socketedGems && g.socketedGems.length > 0)
      ),
    [save.inventory, equippedUids]
  );

  const listableGems = useMemo<SocketGemInstance[]>(
    () => normalizeSocketGems(save.socketGems).filter((g) => !socketedGemUids.has(g.uid)),
    [save.socketGems, socketedGemUids]
  );

  const renderLotVisual = (lot: AuctionLotItem) => {
    if (lot.itemKind === 'gear' && lot.gear) {
      const tpl = GEAR_TEMPLATES[lot.gear.templateId];
      if (tpl) {
        return (
          <div className={`a2-item-card w-14 h-14 shrink-0 ${RARITY_FRAME_CLASS[lot.rarity]}`}>
            <div className="a2-item-inner flex items-center justify-center">
              <GearSlotSvg
                slot={tpl.slot}
                weaponArchetype={tpl.weaponArchetype}
                accentHex={tpl.visualAccentHex}
                className="w-10 h-10"
              />
            </div>
          </div>
        );
      }
    }
    if (lot.itemKind === 'socket_gem' && lot.socketGem) {
      const def = SOCKET_GEM_META[lot.socketGem.color];
      return (
        <div
          className={`w-14 h-14 rounded-2xl border-2 ${def.borderClass} ${def.bgClass} flex flex-col items-center justify-center shrink-0`}
        >
          <span
            className="w-6 h-6 rounded-full border-2 border-white/80 shadow-md"
            style={{ backgroundColor: def.hex }}
          />
          <span className="text-[9px] font-black text-white mt-0.5">
            Cấp {getSocketGemTierRoman(lot.socketGem.tier)}
          </span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5 bg-[#040611]/92 overflow-y-auto">
      <div className="cel-panel-ornate w-full max-w-4xl rounded-3xl p-4 sm:p-6 my-auto max-h-[92vh] overflow-y-auto a2-scroll a2-modal-enter">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-300/65 flex items-center justify-center shrink-0">
              <Gavel className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg sm:text-xl font-black text-white truncate">
                Sàn Đấu Giá Tinh Giới
              </h2>
              <p className="text-[11px] text-slate-300 truncate">
                Đấu giá, mua đứt Trang Bị [S] &amp; Bảo Thạch hoặc ký gửi vật phẩm dư thu về Ngọc Hồn!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-[#070b1a] border border-purple-400/45 text-xs font-mono-nums font-black text-purple-200 flex items-center gap-1.5">
              <SoulGemIcon className="w-3.5 h-3.5" />
              <span>{save.gems.toLocaleString('vi-VN')} Ngọc</span>
            </div>
            <button
              type="button"
              disabled={save.gems < 15}
              onClick={() => {
                soundEngine.playUiClick(1.05);
                onRefreshLots();
              }}
              className="a2-purple-btn px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              title="Làm mới danh sách phiên đấu giá (15 Ngọc Hồn)"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Làm Mới (15 Ngọc)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng Sàn Đấu Giá"
              className="a2-slate-btn w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hero Banner */}
        <div className="relative rounded-2xl overflow-hidden border border-amber-400/40 mb-4 bg-gradient-to-br from-[#16102b] to-[#080d22]">
          {!imgErr && (
            <img
              src={celestialAuctionArt}
              alt="Sàn Đấu Giá Tinh Giới"
              referrerPolicy="no-referrer"
              onError={() => setImgErr(true)}
              className="w-full h-28 sm:h-36 object-cover opacity-75"
            />
          )}
          <div className="p-3.5 sm:p-4 bg-gradient-to-t from-[#050814] via-[#050814]/85 to-transparent flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                Thương Hội Liên Tinh Giới · Minh Bạch &amp; An Toàn
              </div>
              <div className="text-xs text-slate-200 font-semibold mt-0.5">
                Phiên ký gửi hết hạn tự động thanh toán Ngọc Hồn hoặc hoàn đồ về Hòm Nhận Đồ.
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-[#091128] border border-amber-400/40 text-xs font-mono-nums font-black text-amber-200 flex items-center gap-2">
              <span>{aiPlayers.length} AI Live đang săn đồ · {ah.totalTrades} giao dịch</span>
            </div>
          </div>
          {liveBidEvents.length > 0 && (
            <div className="px-3.5 py-2 border-t border-sky-400/25 bg-[#061124]/95 flex items-center gap-2 text-[11px] text-sky-100">
              <span className="font-black text-sky-300 shrink-0">
                {liveBidEvents[0].bidderName} {liveBidEvents[0].bidderTag}
              </span>
              <span className="truncate">
                {liveBidEvents[0].action === 'buyout'
                  ? `vừa mua đứt "${liveBidEvents[0].lotLabel}" (${liveBidEvents[0].amount} Ngọc)!`
                  : `vừa nâng giá "${liveBidEvents[0].lotLabel}" lên ${liveBidEvents[0].amount} Ngọc!`}
              </span>
            </div>
          )}
        </div>

        {/* Sub-Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => setTab('market')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              tab === 'market' ? 'a2-yellow-btn' : 'a2-slate-btn'
            }`}
          >
            <Gavel className="w-3.5 h-3.5" />
            <span>Phiên Đấu Giá ({marketLots.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('consign')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              tab === 'consign' ? 'a2-yellow-btn' : 'a2-slate-btn'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Ký Gửi Của Tôi ({playerListings.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('claims')}
            className={`relative px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              tab === 'claims' ? 'a2-yellow-btn' : 'a2-slate-btn'
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Hòm Nhận Đồ ({ah.claimBox.length})</span>
          </button>
        </div>

        {/* TAB 1: MARKET LOTS */}
        {tab === 'market' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {marketLots.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-slate-800 bg-[#070b1a] p-6 text-center text-xs text-slate-300">
                Hiện không có phiên đấu giá mở. Nhấn &ldquo;Làm Mới (15 Ngọc)&rdquo; để triệu hồi lô hàng mới!
              </div>
            ) : (
              marketLots.map((lot) => {
                const rMeta = RARITY_META[lot.rarity];
                const minNextBid = Math.max(
                  lot.startingBid,
                  lot.highestBidderIsPlayer
                    ? lot.currentBid
                    : Math.ceil(lot.currentBid * 1.1) + 1
                );
                const msLeft = Math.max(0, lot.endsAt - now);
                const gemDesc = lot.socketGem ? getSocketGemLabel(lot.socketGem) : null;
                const tplDesc = lot.gear ? GEAR_TEMPLATES[lot.gear.templateId]?.perkLabel : null;

                return (
                  <div
                    key={lot.id}
                    className={`rounded-2xl border p-3.5 flex flex-col justify-between gap-3 ${
                      lot.highestBidderIsPlayer
                        ? 'bg-[#091c18]/90 border-emerald-400/65'
                        : 'bg-[#070b1a]/95 border-amber-400/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {renderLotVisual(lot)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-black uppercase ${rMeta.textClass}`}>
                            {rMeta.label}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] font-mono-nums font-black text-amber-300">
                            <Timer className="w-3 h-3" />
                            {formatCountdown(msLeft)}
                          </span>
                        </div>
                        <div className="font-display text-sm font-black text-white truncate mt-0.5">
                          {lot.label}
                        </div>
                        <div className="text-[11px] text-slate-300 truncate mt-0.5">
                          {gemDesc ?? tplDesc ?? 'Vật phẩm Tinh Giới'} · Người bán:{' '}
                          <span className="text-sky-200 font-semibold">
                            {lot.sellerName} [AI Live]
                          </span>
                        </div>
                        {lot.highestBidderIsPlayer ? (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-[10px] font-black text-emerald-200">
                            Bạn Đang Dẫn Đầu ({lot.playerBidAmount} Ngọc)
                          </span>
                        ) : lot.highestBidderName ? (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/45 text-[10px] font-black text-sky-200">
                            <span className="size-1.5 rounded-full bg-emerald-400" />
                            <span>Đang dẫn giá: {lot.highestBidderName}</span>
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                      <div className="bg-[#050814] rounded-xl px-2.5 py-1.5 border border-slate-800">
                        <div className="text-[10px] text-slate-400 font-bold">Giá Hiện Tại</div>
                        <div className="font-mono-nums font-black text-amber-300">
                          {lot.currentBid} Ngọc
                        </div>
                      </div>
                      <div className="bg-[#050814] rounded-xl px-2.5 py-1.5 border border-slate-800">
                        <div className="text-[10px] text-slate-400 font-bold">Mua Đứt Ngay</div>
                        <div className="font-mono-nums font-black text-purple-300">
                          {lot.buyoutPrice} Ngọc
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={lot.highestBidderIsPlayer || save.gems < minNextBid || minNextBid >= lot.buyoutPrice}
                        onClick={() => {
                          soundEngine.playUiClick(1.06);
                          onPlaceBid(lot.id, minNextBid);
                        }}
                        className="a2-purple-btn flex-1 py-2 px-3 rounded-xl text-[11px] font-black whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                      >
                        {lot.highestBidderIsPlayer
                          ? 'Đang Dẫn Đầu'
                          : `Đặt Giá (${minNextBid} Ngọc)`}
                      </button>
                      <button
                        type="button"
                        disabled={save.gems < lot.buyoutPrice}
                        onClick={() => {
                          soundEngine.playLevelUp();
                          onBuyoutLot(lot.id);
                        }}
                        className="a2-yellow-btn flex-1 py-2 px-3 rounded-xl text-[11px] font-black whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                      >
                        Mua Đứt ({lot.buyoutPrice} Ngọc)
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: CONSIGNMENT LISTING */}
        {tab === 'consign' && (
          <div className="space-y-4">
            {playerListings.length > 0 && (
              <div className="rounded-2xl border border-amber-400/35 bg-[#070b1a]/95 p-3.5">
                <div className="text-xs font-black text-amber-200 uppercase tracking-wider mb-2.5">
                  Đang Ký Gửi Trên Sàn ({playerListings.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {playerListings.map((lot) => (
                    <div
                      key={lot.id}
                      className="rounded-xl border border-slate-700 bg-[#0b1228] p-2.5 flex items-center justify-between gap-2.5"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-black text-white truncate">{lot.label}</div>
                        <div className="text-[10px] font-mono-nums text-amber-300">
                          Hiện tại: {lot.currentBid} · Mua đứt: {lot.buyoutPrice} Ngọc · Còn{' '}
                          {formatCountdown(Math.max(0, lot.endsAt - now))}
                        </div>
                        {lot.highestBidderName && (
                          <div className="text-[10px] text-sky-300 font-bold truncate mt-0.5">
                            Đang trả giá: {lot.highestBidderName}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick(0.95);
                          onCancelListing(lot.id);
                        }}
                        className="a2-slate-btn px-2.5 py-1.5 rounded-lg text-[10px] font-black whitespace-nowrap cursor-pointer shrink-0"
                      >
                        Thu Hồi
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-sky-400/35 bg-[#070b1a]/95 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="font-display text-sm font-black text-white">
                    Chọn Trang Bị Hoặc Bảo Thạch Dư Để Ký Gửi (Phiên 5 Phút)
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Thương hội thu phí bảo hiểm 0% · Vật phẩm đang mặc hoặc đã khảm ngọc không thể ký gửi.
                  </p>
                </div>
              </div>

              {listableGears.length === 0 && listableGems.length === 0 ? (
                <div className="text-xs text-slate-400 py-4 text-center">
                  Kho đồ không có trang bị dư hoặc bảo thạch chưa khảm để ký gửi.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-52 overflow-y-auto a2-scroll mb-3">
                    {listableGears.map((g) => {
                      const tpl = GEAR_TEMPLATES[g.templateId];
                      if (!tpl) return null;
                      const key = `gear:${g.uid}`;
                      const selected = selectedConsignKey === key;
                      const suggested = getSuggestedGearPricing(g.rarity);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setSelectedConsignKey(key);
                            setCustomStartBid(suggested.start);
                            setCustomBuyout(suggested.buyout);
                          }}
                          className={`rounded-xl border p-2 text-left flex items-center gap-2 cursor-pointer transition-colors ${
                            selected
                              ? 'bg-amber-400/15 border-amber-300'
                              : 'bg-[#090f24] border-slate-700 hover:border-amber-400/60'
                          }`}
                        >
                          <GearSlotSvg
                            slot={tpl.slot}
                            weaponArchetype={tpl.weaponArchetype}
                            accentHex={tpl.visualAccentHex}
                            className="w-8 h-8 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-[11px] font-black text-white truncate">
                              {tpl.name}
                            </div>
                            <div className={`text-[9px] font-bold ${RARITY_META[g.rarity].textClass}`}>
                              {RARITY_META[g.rarity].label} · Lv.{g.level}
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    {listableGems.map((gem) => {
                      const def = SOCKET_GEM_META[gem.color];
                      const key = `gem:${gem.uid}`;
                      const selected = selectedConsignKey === key;
                      const start = gem.tier === 3 ? 42 : gem.tier === 2 ? 22 : 12;
                      const buyout = gem.tier === 3 ? 68 : gem.tier === 2 ? 36 : 20;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setSelectedConsignKey(key);
                            setCustomStartBid(start);
                            setCustomBuyout(buyout);
                          }}
                          className={`rounded-xl border p-2 text-left flex items-center gap-2 cursor-pointer transition-colors ${
                            selected
                              ? 'bg-amber-400/15 border-amber-300'
                              : 'bg-[#090f24] border-slate-700 hover:border-amber-400/60'
                          }`}
                        >
                          <span
                            className="w-6 h-6 rounded-full border border-white/80 shrink-0"
                            style={{ backgroundColor: def.hex }}
                          />
                          <div className="min-w-0">
                            <div className="text-[11px] font-black text-white truncate">
                              {def.name}
                            </div>
                            <div className={`text-[9px] font-bold ${def.textClass}`}>
                              Cấp {getSocketGemTierRoman(gem.tier)} · {def.statShort}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {selectedConsignKey && (
                    <div className="flex flex-wrap items-end justify-between gap-3 pt-3 border-t border-slate-800">
                      <div className="flex flex-wrap gap-3">
                        <label className="text-[11px] font-bold text-slate-300">
                          Giá Khởi Điểm (Ngọc)
                          <input
                            type="number"
                            min={5}
                            max={500}
                            value={customStartBid}
                            onChange={(e) => {
                              const v = Math.max(5, Number(e.target.value) || 5);
                              setCustomStartBid(v);
                              if (customBuyout <= v) setCustomBuyout(v + 8);
                            }}
                            className="mt-1 block w-28 rounded-xl bg-slate-950 border border-slate-700 px-2.5 py-1.5 font-mono-nums text-xs font-black text-amber-300"
                          />
                        </label>
                        <label className="text-[11px] font-bold text-slate-300">
                          Giá Mua Đứt (Ngọc)
                          <input
                            type="number"
                            min={customStartBid + 2}
                            max={900}
                            value={customBuyout}
                            onChange={(e) =>
                              setCustomBuyout(Math.max(customStartBid + 2, Number(e.target.value) || 10))
                            }
                            className="mt-1 block w-28 rounded-xl bg-slate-950 border border-slate-700 px-2.5 py-1.5 font-mono-nums text-xs font-black text-purple-300"
                          />
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playLevelUp();
                          const [kind, uid] = selectedConsignKey.split(':');
                          if (kind === 'gear') onListGear(uid, customStartBid, customBuyout);
                          else if (kind === 'gem') onListGem(uid, customStartBid, customBuyout);
                          setSelectedConsignKey('');
                        }}
                        className="a2-emerald-btn px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer"
                      >
                        Đăng Bán Lên Sàn Ngay
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CLAIM BOX */}
        {tab === 'claims' && (
          <div className="space-y-3">
            {ah.claimBox.length > 0 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playLevelUp();
                    onClaimAll();
                  }}
                  className="a2-yellow-btn px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer"
                >
                  Nhận Tất Cả ({ah.claimBox.length})
                </button>
              </div>
            )}

            {ah.claimBox.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-[#070b1a] p-6 text-center text-xs text-slate-300">
                Hòm Nhận Đồ đang trống. Vật phẩm thắng đấu giá hoặc Ngọc Hồn bán được sẽ gửi về đây!
              </div>
            ) : (
              <div className="space-y-2">
                {ah.claimBox.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-2xl border border-emerald-400/40 bg-[#071513]/90 p-3 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-black text-white">{entry.title}</div>
                      <div className="text-[11px] text-slate-300 mt-0.5">{entry.reason}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playLevelUp();
                        onClaimEntry(entry.id);
                      }}
                      className="a2-emerald-btn px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer"
                    >
                      {entry.gems ? `Nhận +${entry.gems} Ngọc` : 'Nhận Vào Kho'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
