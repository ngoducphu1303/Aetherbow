import { canClaimChapter2Asset } from '../data/chapter2Collection';
import React, { useState } from 'react';
import {
  Camera,
  Check,
  Eye,
  RotateCcw,
  RotateCw,
  Shield,
  Sparkles,
  X,
} from 'lucide-react';
import { HERO_MAP } from '../data/heroesData';
import { HERO_SKINS } from '../data/wave3Data';
import { ZODIAC_WINGS } from '../data/wave7Data';
import { getMountAppearance, ZODIAC_MOUNTS } from '../data/wave8Data';
import { DIVINE_HALO_CATALOG } from '../data/wave10Data';
import { ASTRAL_STEED_DEFS, getAstralSteedStats } from '../data/wave13Data';
import {
  AstralSteedId,
  HaloId,
  HeroSkinId,
  LobbyCameraPreset,
  MountId,
  SaveData,
  WardrobePreviewOverrides,
  WeaponAuraId,
  WingId,
} from '../types/game';
import { getHeroAssetPack, getSkinAssetPack, SOLAR_LEO_ITEM_THUMBNAILS } from '../data/assetRegistry';
import { MountShardIcon, ResilientAssetImg, SoulGemIcon, WingFeatherIcon } from './GameIcons';

interface WardrobeModalProps {
  save: SaveData;
  preview: WardrobePreviewOverrides;
  cameraPreset: LobbyCameraPreset;
  onChangePreview: (next: WardrobePreviewOverrides) => void;
  onChangeCameraPreset: (preset: LobbyCameraPreset) => void;
  onRotateHero: (deltaRad: number) => void;
  onResetHeroRotation: () => void;
  onSelectSkin: (skinId: HeroSkinId) => void;
  onUnlockSkin: (skinId: HeroSkinId) => void;
  onEquipWing: (wingId: WingId | null) => void;
  onUnlockWing: (wingId: WingId) => void;
  onEquipMount: (mountId: MountId | null) => void;
  onUnlockMount: (mountId: MountId) => void;
  onEquipSteed?: (steedId: AstralSteedId | null) => void;
  onEquipWeaponAura: (auraId: WeaponAuraId) => void;
  onUnlockWeaponAura: (auraId: WeaponAuraId) => void;
  onEquipHalo?: (haloId: HaloId | null) => void;
  onUnlockHalo?: (haloId: HaloId) => void;
  onClose: () => void;
}

type WardrobeTab = 'halos' | 'mounts' | 'wings' | 'skins';

export const WardrobeModal: React.FC<WardrobeModalProps> = ({
  save,
  preview,
  cameraPreset,
  onChangePreview,
  onChangeCameraPreset,
  onRotateHero,
  onResetHeroRotation,
  onSelectSkin,
  onUnlockSkin,
  onEquipWing,
  onUnlockWing,
  onEquipMount,
  onUnlockMount,
  onEquipSteed,
  onEquipHalo,
  onUnlockHalo,
  onClose,
}) => {
  const [tab, setTab] = useState<WardrobeTab>('halos');

  const currentHero = HERO_MAP[save.selectedHeroId] ?? HERO_MAP.aurelia;
  const equippedSkin = save.equippedSkinByHero?.[save.selectedHeroId] ?? 'default';
  const activeSkinPreview = preview.skinId ?? equippedSkin;
  const activeWingPreview = preview.wingId !== undefined ? preview.wingId : (save.equippedWingId ?? null);
  const { mountId: equippedMountId, astralSteedId: equippedSteedId } = getMountAppearance(save);
  const { mountId: activeMountPreview, astralSteedId: activeSteedPreview } = getMountAppearance(
    save,
    preview.mountId,
    preview.astralSteedId
  );
  const activeHaloPreview =
    preview.haloId !== undefined ? preview.haloId : (save.equippedHaloId ?? null);

  const unlockedSkins = new Set<HeroSkinId>(save.unlockedSkins ?? ['default']);
  const unlockedWings = new Set<WingId>(save.unlockedWings ?? []);
  const unlockedMounts = new Set<MountId>(save.unlockedMounts ?? []);
  const unlockedAstralSteeds = new Set<AstralSteedId>(save.unlockedAstralSteeds ?? []);
  const unlockedHalos = new Set<HaloId>(save.unlockedHalos ?? []);

  return (
    <div className="fixed inset-0 z-40 pointer-events-none flex flex-col justify-between p-3 sm:p-5">
      {/* Top 360 Viewport Controls Bar (Leaves center hero unobstructed) */}
      <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-2 max-w-5xl w-full mx-auto bg-[#080d1e]/90 border border-amber-400/45 rounded-2xl px-3.5 py-2.5 shadow-2xl">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          <div>
            <div className="font-display text-sm sm:text-base font-black text-white leading-tight">
              Phòng Thử Đồ 3D Xoay 360°
            </div>
            <div className="text-[10px] text-slate-300 font-semibold">
              Kéo trực tiếp lên Anh Hùng giữa màn hình hoặc dùng nút xoay để ngắm 360°
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onRotateHero(-0.55)}
            className="a2-slate-btn px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-sky-300" />
            <span>Xoay Trái</span>
          </button>
          <button
            type="button"
            onClick={() => onRotateHero(0.55)}
            className="a2-slate-btn px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 whitespace-nowrap cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5 text-sky-300" />
            <span>Xoay Phải</span>
          </button>
          <button
            type="button"
            onClick={onResetHeroRotation}
            className="a2-slate-btn px-2.5 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap cursor-pointer"
          >
            Góc Chuẩn
          </button>
          <button
            type="button"
            onClick={() =>
              onChangeCameraPreset(cameraPreset === 'closeup' ? 'wardrobe' : 'closeup')
            }
            className="a2-slate-btn px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 whitespace-nowrap cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-amber-300" />
            <span>{cameraPreset === 'closeup' ? 'Toàn Thân' : 'Cận Cảnh'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng Phòng Thử Đồ"
            className="px-3 py-1.5 rounded-xl bg-rose-600/85 hover:bg-rose-500 border border-rose-300/60 text-xs font-black text-white flex items-center gap-1 whitespace-nowrap cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Thoát</span>
          </button>
        </div>
      </div>

      {/* Bottom Docked Drawer so Hero remains clear at center-top */}
      <div className="pointer-events-auto w-full max-w-5xl mx-auto cel-panel-ornate rounded-3xl p-3.5 sm:p-4 max-h-[46vh] flex flex-col gap-3 a2-dock-enter">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'halos', label: 'Hào Quang 3D' },
                { id: 'mounts', label: 'Thú Cưỡi 3D' },
                { id: 'wings', label: 'Cánh Hoàng Đạo' },
                { id: 'skins', label: 'Trang Phục Skin' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer transition-colors ${
                  tab === t.id
                    ? 'a2-yellow-btn'
                    : 'bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono-nums font-black">
            <span className="flex items-center gap-1 text-purple-300">
              <SoulGemIcon className="w-3.5 h-3.5" />
              {save.gems}
            </span>
            <span className="flex items-center gap-1 text-amber-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              {save.divineCrystals ?? 0} TT
            </span>
            <span className="flex items-center gap-1 text-amber-300">
              <MountShardIcon className="w-3.5 h-3.5" />
              {save.mountShards ?? 0}
            </span>
            <span className="flex items-center gap-1 text-sky-300">
              <WingFeatherIcon className="w-3.5 h-3.5" />
              {save.wingFeathers ?? 0}
            </span>
            <button
              type="button"
              onClick={() => onChangePreview({})}
              className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10px] text-slate-300 hover:text-white cursor-pointer"
            >
              Hoàn Tác Thử
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pr-1">
          {tab === 'halos' &&
            DIVINE_HALO_CATALOG.filter((item) => canClaimChapter2Asset(item.id, save.highestChapterCleared)).map((h) => {
              const owned = unlockedHalos.has(h.id);
              const equipped = save.equippedHaloId === h.id;
              const isPreviewing = activeHaloPreview === h.id;
              const hasCrystals = (save.divineCrystals ?? 0) >= h.unlockDivineCrystals;
              const hasGems = save.gems >= h.unlockGems;
              const canUnlock = hasCrystals || hasGems;
              return (
                <div
                  key={h.id}
                  className={`rounded-2xl p-3 border flex flex-col justify-between gap-2 ${
                    isPreviewing
                      ? 'bg-amber-400/10 border-amber-300'
                      : 'bg-[#080d1e] border-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {SOLAR_LEO_ITEM_THUMBNAILS[h.id] && (
                      <div className="w-11 h-11 rounded-xl overflow-hidden border border-amber-300/45 bg-[#101833] shrink-0">
                        <ResilientAssetImg
                          src={SOLAR_LEO_ITEM_THUMBNAILS[h.id]}
                          alt={h.name}
                          className="w-full h-full object-cover"
                          fallback={<Sparkles className="w-4 h-4 text-amber-300 m-auto" />}
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 text-[10px] font-black mb-1">
                        <span className="text-amber-300">{h.badge}</span>
                        {equipped && <span className="text-emerald-300">ĐANG ĐEO</span>}
                      </div>
                      <div className="text-xs font-black text-white">{h.name}</div>
                      <div className="text-[10px] text-slate-300 mt-1">
                        +{Math.round(h.baseAtkPct * 100)}% ATK · +{Math.round(h.baseHpPct * 100)}% HP · +{Math.round(h.baseCritDmg * 100)}% ST Bạo
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onChangePreview({ ...preview, haloId: h.id })}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-sky-400 text-[11px] font-black text-sky-200 flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Mặc Thử</span>
                    </button>
                    {owned ? (
                      <button
                        type="button"
                        onClick={() => onEquipHalo?.(equipped ? null : h.id)}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-black whitespace-nowrap cursor-pointer ${
                          equipped ? 'a2-slate-btn' : 'a2-emerald-btn'
                        }`}
                      >
                        {equipped ? 'Tháo' : 'Trang Bị'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!canUnlock}
                        onClick={() => onUnlockHalo?.(h.id)}
                        className="flex-1 py-1.5 px-2 rounded-lg a2-yellow-btn disabled:opacity-45 text-[10px] font-black whitespace-nowrap cursor-pointer font-mono-nums"
                      >
                        {hasCrystals ? `${h.unlockDivineCrystals} Thần Tinh` : `${h.unlockGems} Ngọc`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

          {tab === 'mounts' && (
            <>
              <div
                className={`rounded-2xl p-3 border flex flex-col justify-between gap-2 ${
                  activeMountPreview === null && activeSteedPreview === null
                    ? 'bg-amber-400/10 border-amber-300'
                    : 'bg-[#080d1e] border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 text-[10px] font-black mb-1">
                    <span className="text-slate-300">MẶC ĐỊNH · ĐI BỘ</span>
                    {!equippedMountId && !equippedSteedId && (
                      <span className="text-emerald-300">ĐANG ÁP DỤNG</span>
                    )}
                  </div>
                  <div className="text-xs font-black text-white">Không Đeo Thú Cưỡi</div>
                  <div className="text-[10px] text-slate-300 mt-1">
                    Xuống ngựa hoàn toàn để ngắm dáng đứng gốc của Anh Hùng 3D.
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onChangePreview({ ...preview, mountId: null, astralSteedId: null })}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-sky-400 text-[11px] font-black text-sky-200 flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Mặc Thử</span>
                  </button>
                  <button
                    type="button"
                    disabled={!equippedMountId && !equippedSteedId}
                    onClick={() => {
                      onEquipMount(null);
                      onChangePreview({ ...preview, mountId: undefined, astralSteedId: undefined });
                    }}
                    className="flex-1 py-1.5 px-2 rounded-lg a2-slate-btn disabled:opacity-45 text-[11px] font-black whitespace-nowrap cursor-pointer"
                  >
                    {equippedMountId || equippedSteedId ? 'Xuống Ngựa' : 'Đã Tháo'}
                  </button>
                </div>
              </div>

              {ZODIAC_MOUNTS.filter((item) => canClaimChapter2Asset(item.id, save.highestChapterCleared)).map((m) => {
                const owned = unlockedMounts.has(m.id);
                const equipped = equippedMountId === m.id;
                const isPreviewing = activeMountPreview === m.id && activeSteedPreview === null;
                const hasShards = (save.mountShards ?? 0) >= m.unlockShards;
                const hasGems = save.gems >= m.unlockGems;
                const canUnlock = hasShards || hasGems;
                return (
                  <div
                    key={m.id}
                    className={`rounded-2xl p-3 border flex flex-col justify-between gap-2 ${
                      isPreviewing
                        ? 'bg-amber-400/10 border-amber-300'
                        : 'bg-[#080d1e] border-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {SOLAR_LEO_ITEM_THUMBNAILS[m.id] && (
                        <div className="w-11 h-11 rounded-xl overflow-hidden border border-amber-300/45 bg-[#101833] shrink-0">
                          <ResilientAssetImg
                            src={SOLAR_LEO_ITEM_THUMBNAILS[m.id]}
                            alt={m.name}
                            className="w-full h-full object-cover"
                            fallback={<Sparkles className="w-4 h-4 text-amber-300 m-auto" />}
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 text-[10px] font-black mb-1">
                          <span className="text-amber-300">{m.badge}</span>
                          {equipped && <span className="text-emerald-300">ĐANG CƯỠI</span>}
                        </div>
                        <div className="text-xs font-black text-white">{m.name}</div>
                        <div className="text-[10px] text-slate-300 mt-1">
                          +{m.baseAtk} ATK · +{m.baseHp} HP · +{Math.round(m.baseMoveSpeed * 100)}% Tốc
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          onChangePreview({ ...preview, mountId: m.id, astralSteedId: undefined })
                        }
                        className="flex-1 py-1.5 px-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-sky-400 text-[11px] font-black text-sky-200 flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Mặc Thử</span>
                      </button>
                      {owned ? (
                        <button
                          type="button"
                          onClick={() => {
                            onEquipMount(equipped ? null : m.id);
                            onChangePreview({ ...preview, mountId: undefined, astralSteedId: undefined });
                          }}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-black whitespace-nowrap cursor-pointer ${
                            equipped ? 'a2-slate-btn' : 'a2-emerald-btn'
                          }`}
                        >
                          {equipped ? 'Tháo' : 'Trang Bị'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!canUnlock}
                          onClick={() => {
                            onUnlockMount(m.id);
                            onChangePreview({ ...preview, mountId: undefined, astralSteedId: undefined });
                          }}
                          className="flex-1 py-1.5 px-2 rounded-lg a2-yellow-btn disabled:opacity-45 text-[10px] font-black whitespace-nowrap cursor-pointer font-mono-nums"
                        >
                          {m.unlockShards === 0 && m.unlockGems === 0
                            ? 'Nhận Miễn Phí'
                            : hasShards ? `${m.unlockShards} Mảnh` : `${m.unlockGems} Ngọc`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {ASTRAL_STEED_DEFS.map((st) => {
                const owned = unlockedAstralSteeds.has(st.id);
                const equipped = equippedSteedId === st.id;
                const isPreviewing = activeSteedPreview === st.id;
                const starLv = Math.max(1, save.astralSteedStars?.[st.id] ?? 1);
                const statsSt = getAstralSteedStats(st.id, starLv);
                return (
                  <div
                    key={st.id}
                    className={`rounded-2xl p-3 border flex flex-col justify-between gap-2 ${
                      isPreviewing
                        ? 'bg-sky-400/10 border-sky-300'
                        : 'bg-[#080d1e] border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 text-[10px] font-black mb-1">
                        <span className="text-sky-300">{st.badge}</span>
                        {equipped && <span className="text-emerald-300">ĐANG CƯỠI</span>}
                      </div>
                      <div className="text-xs font-black text-white">{st.name}</div>
                      <div className="text-[10px] text-slate-300 mt-1">
                        +{Math.round(statsSt.atkPct * 100)}% ATK · +{Math.round(statsSt.hpPct * 100)}% HP · +{Math.round(statsSt.moveSpeed * 100)}% Tốc
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          onChangePreview({ ...preview, astralSteedId: st.id, mountId: undefined })
                        }
                        className="flex-1 py-1.5 px-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-sky-400 text-[11px] font-black text-sky-200 flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Mặc Thử</span>
                      </button>
                      {owned ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (onEquipSteed) {
                              onEquipSteed(equipped ? null : st.id);
                            } else if (equipped) {
                              onEquipMount(null);
                            }
                            onChangePreview({ ...preview, mountId: undefined, astralSteedId: undefined });
                          }}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-black whitespace-nowrap cursor-pointer ${
                            equipped ? 'a2-slate-btn' : 'a2-emerald-btn'
                          }`}
                        >
                          {equipped ? 'Tháo' : 'Trang Bị'}
                        </button>
                      ) : (
                        <span className="flex-1 py-1.5 px-2 rounded-lg bg-slate-900 border border-slate-700 text-center text-[10px] font-black text-slate-400 whitespace-nowrap">
                          Mở ở Thánh Điện
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {tab === 'wings' &&
            ZODIAC_WINGS.filter((item) => canClaimChapter2Asset(item.id, save.highestChapterCleared)).map((w) => {
              const owned = unlockedWings.has(w.id);
              const equipped = save.equippedWingId === w.id;
              const isPreviewing = activeWingPreview === w.id;
              const hasFeathers = (save.wingFeathers ?? 0) >= w.unlockFeathers;
              const hasGems = save.gems >= w.unlockGems;
              const canUnlock = hasFeathers || hasGems;
              return (
                <div
                  key={w.id}
                  className={`rounded-2xl p-3 border flex flex-col justify-between gap-2 ${
                    isPreviewing
                      ? 'bg-sky-400/10 border-sky-300'
                      : 'bg-[#080d1e] border-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {SOLAR_LEO_ITEM_THUMBNAILS[w.id] && (
                      <div className="w-11 h-11 rounded-xl overflow-hidden border border-amber-300/45 bg-[#101833] shrink-0">
                        <ResilientAssetImg
                          src={SOLAR_LEO_ITEM_THUMBNAILS[w.id]}
                          alt={w.name}
                          className="w-full h-full object-cover"
                          fallback={<Sparkles className="w-4 h-4 text-amber-300 m-auto" />}
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 text-[10px] font-black mb-1">
                        <span className="text-sky-300">{w.badge}</span>
                        {equipped && <span className="text-emerald-300">ĐANG ĐEO</span>}
                      </div>
                      <div className="text-xs font-black text-white">{w.name}</div>
                      <div className="text-[10px] text-slate-300 mt-1">
                        +{w.baseAtk} ATK · +{w.baseHp} HP · +{Math.round(w.baseCrit * 100)}% Chí Mạng
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onChangePreview({ ...preview, wingId: w.id })}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-sky-400 text-[11px] font-black text-sky-200 flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Mặc Thử</span>
                    </button>
                    {owned ? (
                      <button
                        type="button"
                        onClick={() => onEquipWing(equipped ? null : w.id)}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-black whitespace-nowrap cursor-pointer ${
                          equipped ? 'a2-slate-btn' : 'a2-emerald-btn'
                        }`}
                      >
                        {equipped ? 'Tháo' : 'Trang Bị'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!canUnlock}
                        onClick={() => onUnlockWing(w.id)}
                        className="flex-1 py-1.5 px-2 rounded-lg a2-yellow-btn disabled:opacity-45 text-[10px] font-black whitespace-nowrap cursor-pointer font-mono-nums"
                      >
                        {hasFeathers ? `${w.unlockFeathers} Lông` : `${w.unlockGems} Ngọc`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

          {tab === 'skins' && (() => {
            const isDefaultEquipped = equippedSkin === 'default';
            const isDefaultPreview = activeSkinPreview === 'default';
            const heroPack = getHeroAssetPack(save.selectedHeroId);
            return (
              <div
                className={`rounded-2xl p-3 border flex flex-col justify-between gap-2 ${
                  isDefaultPreview
                    ? 'bg-amber-400/12 border-amber-300'
                    : 'bg-[#080d1e] border-slate-800'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-amber-300/50 bg-[#101833] shrink-0">
                    <ResilientAssetImg
                      src={heroPack.icon}
                      alt={currentHero.name}
                      className="w-full h-full object-cover object-top"
                      fallback={<Shield className="w-4 h-4 text-amber-300 m-auto" />}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 text-[10px] font-black mb-0.5">
                      <span className="text-amber-300">MẶC ĐỊNH</span>
                      {isDefaultEquipped && <span className="text-emerald-300">ĐANG MẶC</span>}
                    </div>
                    <div className="text-xs font-black text-white truncate">
                      Giáp Gốc · {currentHero.name}
                    </div>
                    <div className="text-[10px] text-slate-300 mt-0.5">
                      Gỡ trang phục về ngoại hình nguyên bản
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onChangePreview({ ...preview, skinId: 'default' })}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-sky-400 text-[11px] font-black text-sky-200 flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Mặc Thử</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectSkin('default')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-black whitespace-nowrap cursor-pointer ${
                      isDefaultEquipped ? 'a2-slate-btn' : 'a2-emerald-btn'
                    }`}
                  >
                    {isDefaultEquipped ? (
                      <span className="inline-flex items-center gap-1">
                        <Check className="w-3 h-3" /> Đang Mặc
                      </span>
                    ) : (
                      'Về Mặc Định'
                    )}
                  </button>
                </div>
              </div>
            );
          })()}

          {tab === 'skins' &&
            HERO_SKINS.filter((sk) => !sk.heroId || sk.heroId === save.selectedHeroId).map((sk) => {
              const owned = unlockedSkins.has(sk.id);
              const equipped = equippedSkin === sk.id;
              const isPreviewing = activeSkinPreview === sk.id;
              const canUnlock = save.gems >= sk.unlockGems && save.gold >= sk.unlockGold;
              const assetPack = getSkinAssetPack(sk.id, save.selectedHeroId);
              return (
                <div
                  key={sk.id}
                  className={`rounded-2xl p-3 border flex flex-col justify-between gap-2 ${
                    isPreviewing
                      ? 'bg-purple-400/10 border-purple-300'
                      : 'bg-[#080d1e] border-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-purple-300/45 bg-[#101833] shrink-0">
                      <ResilientAssetImg
                        src={assetPack.icon}
                        alt={sk.name}
                        className="w-full h-full object-cover object-top"
                        fallback={<Sparkles className="w-4 h-4 text-purple-300 m-auto" />}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 text-[10px] font-black mb-0.5">
                        <span className="text-purple-300">{sk.badge}</span>
                        {equipped && <span className="text-emerald-300">ĐANG MẶC</span>}
                      </div>
                      <div className="text-xs font-black text-white truncate">{sk.name}</div>
                      <div className="text-[10px] text-slate-300 mt-0.5 font-mono-nums">
                        +{sk.atkBonus} ATK · +{sk.hpBonus} HP
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onChangePreview({ ...preview, skinId: sk.id })}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-sky-400 text-[11px] font-black text-sky-200 flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Mặc Thử</span>
                    </button>
                    {owned ? (
                      <button
                        type="button"
                        onClick={() => onSelectSkin(equipped ? 'default' : sk.id)}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-black whitespace-nowrap cursor-pointer ${
                          equipped ? 'a2-slate-btn' : 'a2-emerald-btn'
                        }`}
                      >
                        {equipped ? (
                          <span className="inline-flex items-center gap-1">
                            <Check className="w-3 h-3" /> Tháo
                          </span>
                        ) : (
                          'Trang Bị'
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!canUnlock}
                        onClick={() => onUnlockSkin(sk.id)}
                        className="flex-1 py-1.5 px-2 rounded-lg a2-yellow-btn disabled:opacity-45 text-[10px] font-black whitespace-nowrap cursor-pointer"
                      >
                        {sk.unlockGems > 0 ? `${sk.unlockGems} Ngọc` : sk.unlockGold > 0 ? `${sk.unlockGold} Vàng` : 'Nhận Miễn Phí'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        <div className="hidden sm:flex items-center justify-end text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
          <span>Mẹo: Nhấn &ldquo;Mặc Thử&rdquo; để xem trước mọi Thú Cưỡi, Cánh &amp; Hào Quang ngay trên mô hình 3D.</span>
        </div>
      </div>
    </div>
  );
};
