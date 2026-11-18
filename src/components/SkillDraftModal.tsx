import React, { useState } from 'react';
import {
  Crown,
  Disc,
  Flame,
  Heart,
  RefreshCw,
  Shield,
  Sparkles,
  Swords,
  Zap,
} from 'lucide-react';
import tarotCardArt from '../assets/images/arcane_tarot_frame_1794971375666.jpg';
import { soundEngine } from '../audio/soundEngine';
import { SKILL_RARITY_META, WHEEL_OUTCOMES } from '../data/skillsData';
import {
  EncounterOffer,
  SkillCategory,
  SkillDefinition,
  SkillId,
  WheelOutcome,
} from '../types/game';

interface SkillDraftModalProps {
  mode: 'skill' | 'valkyrie' | 'angel' | 'devil' | 'wheel';
  level: number;
  skillChoices: SkillDefinition[];
  currentStacks: Partial<Record<SkillId, number>>;
  rerollUsed: boolean;
  encounterOffer: EncounterOffer | null;
  onPickSkill: (skillId: SkillId) => void;
  onRerollSkills: () => void;
  onAngelChoice: (choice: 'max_hp' | 'heal') => void;
  onDevilPact: (acceptSkill?: SkillId) => void;
  onWheelComplete: (outcome: WheelOutcome) => void;
}

const TAROT_CARD_ART = tarotCardArt;

const CategoryIcon: React.FC<{ category: SkillCategory; className?: string }> = ({
  category,
  className = 'w-5 h-5',
}) => {
  switch (category) {
    case 'weapon':
      return <Swords className={className} />;
    case 'elemental':
      return <Flame className={className} />;
    case 'circle':
      return <Disc className={className} />;
    case 'strike':
      return <Zap className={className} />;
    case 'meteor':
      return <Sparkles className={className} />;
    case 'sprite':
      return <Crown className={className} />;
    default:
      return <Shield className={className} />;
  }
};

export const SkillDraftModal: React.FC<SkillDraftModalProps> = ({
  mode,
  level,
  skillChoices,
  currentStacks,
  rerollUsed,
  encounterOffer,
  onPickSkill,
  onRerollSkills,
  onAngelChoice,
  onDevilPact,
  onWheelComplete,
}) => {
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [wheelResult, setWheelResult] = useState<WheelOutcome | null>(null);
  const [tarotArtFailed, setTarotArtFailed] = useState(false);

  const handleSpinWheel = () => {
    if (wheelSpinning || wheelResult) return;
    setWheelSpinning(true);
    soundEngine.playWheelTick();
    const chosenIdx = Math.floor(Math.random() * WHEEL_OUTCOMES.length);
    const sliceDeg = 360 / WHEEL_OUTCOMES.length;
    const targetDeg = 1440 + (360 - (chosenIdx * sliceDeg + sliceDeg / 2));
    setWheelAngle(targetDeg);

    window.setTimeout(() => {
      soundEngine.playLevelUp();
      setWheelSpinning(false);
      setWheelResult(WHEEL_OUTCOMES[chosenIdx]);
    }, 1850);
  };

  const isSkillMode = mode === 'skill' || mode === 'valkyrie';

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-3 sm:p-5 bg-[#040611]/88">
      <div className="cel-panel-ornate w-full max-w-3xl rounded-3xl p-5 sm:p-7 max-h-[92vh] overflow-y-auto a2-scroll">
        {/* Header Banner */}
        <div className="text-center mb-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-amber-300 mb-1.5">
            {mode === 'skill'
              ? `Thăng Cấp ${level} · Tinh Tú Ban Phước`
              : mode === 'valkyrie'
              ? 'Phước Lành Valkyrie'
              : mode === 'angel'
              ? 'Thánh Đường Thiên Thần'
              : mode === 'devil'
              ? 'Khế Ước Ác Quỷ'
              : 'Vòng Quay Vận Mệnh'}
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-black text-white">
            {mode === 'skill'
              ? 'Chọn 1 Thẻ Bài Kỹ Năng'
              : mode === 'valkyrie'
              ? 'Ban Phước Huyền Thoại'
              : mode === 'angel'
              ? 'Thiên Thần Ban Ân'
              : mode === 'devil'
              ? 'Giao Kèo Huyết Ma'
              : 'Vòng Quay Hoàng Đạo'}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            {isSkillMode
              ? 'Kết hợp các thẻ bài cùng nguyên tố để tối ưu hóa hỏa lực đạn đạo 3D.'
              : mode === 'angel'
              ? 'Thiên thần ban tặng một nguồn hồi phục trước chặng đường phía trước.'
              : mode === 'devil'
              ? 'Đánh đổi 15% Máu tối đa để nhận ngay kỹ năng bậc cao hoặc từ chối.'
              : 'Quay vòng định mệnh để nhận phần thưởng hậu hĩnh.'}
          </p>
          <div className="cel-divider-gold max-w-xs mx-auto mt-3" />
        </div>

        {/* AAA TAROT SKILL DRAFT CARDS */}
        {isSkillMode && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
              {skillChoices.map((skill) => {
                const stack = currentStacks[skill.id] ?? 0;
                const rMeta = SKILL_RARITY_META[skill.rarity];
                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => onPickSkill(skill.id)}
                    className={`relative text-left rounded-2xl overflow-hidden border-2 ${rMeta.borderClass} bg-[#090d1e] hover:-translate-y-1.5 active:translate-y-0 transition-transform duration-150 cursor-pointer shadow-2xl group flex flex-col justify-between min-h-[245px] sm:min-h-[280px]`}
                  >
                    {/* Tarot Card Art Layer + Fallback */}
                    {!tarotArtFailed && (
                      <img
                        src={TAROT_CARD_ART}
                        alt=""
                        aria-hidden="true"
                        referrerPolicy="no-referrer"
                        onError={() => setTarotArtFailed(true)}
                        className="absolute inset-0 w-full h-full object-cover opacity-55 group-hover:opacity-70 transition-opacity duration-200 pointer-events-none"
                      />
                    )}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: `linear-gradient(180deg, rgba(6, 9, 22, 0.55) 0%, rgba(7, 10, 24, 0.82) 52%, rgba(5, 7, 17, 0.96) 100%)`,
                      }}
                    />

                    {/* Card Top Metadata */}
                    <div className="relative z-10 p-4 flex flex-col items-center text-center flex-1">
                      <div className="w-full flex items-center justify-between text-[11px] font-bold mb-3">
                        <span className={rMeta.badgeClass}>{rMeta.label}</span>
                        <span className="font-mono-nums text-slate-300">
                          Cấp {stack + 1}/{skill.maxStacks}
                        </span>
                      </div>

                      {/* Emblem Medallion */}
                      <div
                        className="w-12 h-12 rounded-2xl border border-amber-200/75 flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.65)] mb-3 text-slate-950"
                        style={{
                          background: `radial-gradient(circle at 35% 30%, #ffffff 0%, ${skill.accentColor} 55%, #0f172a 130%)`,
                        }}
                      >
                        <CategoryIcon category={skill.category} className="w-5 h-5" />
                      </div>

                      <h3 className="font-display text-base font-black text-white group-hover:text-amber-300 transition-colors leading-snug">
                        {skill.name}
                      </h3>

                      <p className="text-xs text-slate-200/95 leading-relaxed mt-2">
                        {skill.description}
                      </p>
                    </div>

                    {/* Card Footer */}
                    <div className="relative z-10 px-4 py-2.5 border-t border-amber-300/20 bg-[#050814]/85 flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-amber-300">
                      <span>Lĩnh Hội</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex justify-center">
              <button
                type="button"
                disabled={rerollUsed}
                onClick={onRerollSkills}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer ${
                  rerollUsed
                    ? 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                    : 'a2-purple-btn'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                <span>{rerollUsed ? 'Đã Đổi Lại (0/1)' : 'Đổi Lại Thẻ Bài (1 lần)'}</span>
              </button>
            </div>
          </>
        )}

        {/* ANGEL ENCOUNTER */}
        {mode === 'angel' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => onAngelChoice('heal')}
              className="text-left p-5 rounded-2xl bg-gradient-to-b from-[#0f292b] to-[#08151d] border border-emerald-400/65 hover:border-emerald-300 transition-colors cursor-pointer shadow-xl"
            >
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-black mb-2">
                <Heart className="w-4 h-4" />
                <span>Hồi Phục Tinh Linh</span>
              </div>
              <h3 className="font-display text-lg font-black text-white mb-1.5">
                Hồi 65% Máu Hiện Tại
              </h3>
              <p className="text-xs text-slate-200 leading-relaxed">
                Lập tức khôi phục sinh lực để tiếp tục đối đầu các tầng Boss tiếp theo.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onAngelChoice('max_hp')}
              className="text-left p-5 rounded-2xl bg-gradient-to-b from-[#112344] to-[#081226] border border-sky-400/65 hover:border-sky-300 transition-colors cursor-pointer shadow-xl"
            >
              <div className="flex items-center gap-2 text-sky-300 text-xs font-black mb-2">
                <Sparkles className="w-4 h-4" />
                <span>Gia Tăng Sinh Mệnh</span>
              </div>
              <h3 className="font-display text-lg font-black text-white mb-1.5">
                +18% Máu Tối Đa
              </h3>
              <p className="text-xs text-slate-200 leading-relaxed">
                Nâng giới hạn sinh lực vĩnh viễn trong lượt chơi và hồi phần máu tăng thêm.
              </p>
            </button>
          </div>
        )}

        {/* DEVIL PACT */}
        {mode === 'devil' && (
          <div className="flex flex-col gap-4">
            {encounterOffer?.devilSkill && (
              <div className="p-5 rounded-2xl bg-gradient-to-b from-[#2b0f21] to-[#130815] border border-rose-500/65 shadow-xl">
                <div className="flex items-center gap-2 text-rose-300 text-xs font-black mb-2">
                  <Flame className="w-4 h-4" />
                  <span>Hy sinh -15% Máu Tối Đa để nhận:</span>
                </div>
                <h3 className="font-display text-xl font-black text-amber-300 mb-1">
                  {encounterOffer.devilSkill.name}
                </h3>
                <p className="text-xs text-slate-200">
                  {encounterOffer.devilSkill.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {encounterOffer?.devilSkill && (
                <button
                  type="button"
                  onClick={() => onDevilPact(encounterOffer.devilSkill?.id)}
                  className="py-3 px-4 rounded-xl bg-gradient-to-b from-rose-500 to-rose-700 border border-rose-200 shadow-[0_3px_0_#881337] text-white font-black text-sm hover:brightness-110 cursor-pointer whitespace-nowrap"
                >
                  Chấp Nhận Khế Ước (-15% Max HP)
                </button>
              )}
              <button
                type="button"
                onClick={() => onDevilPact(undefined)}
                className="a2-slate-btn py-3 px-4 rounded-xl font-black text-sm cursor-pointer whitespace-nowrap"
              >
                Từ Chối &amp; Tiếp Tục
              </button>
            </div>
          </div>
        )}

        {/* LUCKY WHEEL */}
        {mode === 'wheel' && (
          <div className="flex flex-col items-center gap-5">
            <div className="relative w-56 h-56 flex items-center justify-center">
              <div className="absolute -top-3 z-10 w-0 h-0 border-l-[11px] border-l-transparent border-r-[11px] border-r-transparent border-t-[18px] border-t-amber-300 drop-shadow" />
              <svg
                viewBox="0 0 200 200"
                className="w-56 h-56 rounded-full border-4 border-amber-300 shadow-2xl transition-transform duration-[1800ms] ease-out"
                style={{ transform: `rotate(${wheelAngle}deg)` }}
              >
                {WHEEL_OUTCOMES.map((out, idx) => {
                  const total = WHEEL_OUTCOMES.length;
                  const startDeg = (idx * 360) / total - 90;
                  const endDeg = ((idx + 1) * 360) / total - 90;
                  const rad1 = (startDeg * Math.PI) / 180;
                  const rad2 = (endDeg * Math.PI) / 180;
                  const x1 = 100 + 96 * Math.cos(rad1);
                  const y1 = 100 + 96 * Math.sin(rad1);
                  const x2 = 100 + 96 * Math.cos(rad2);
                  const y2 = 100 + 96 * Math.sin(rad2);
                  const midRad = ((startDeg + endDeg) / 2) * (Math.PI / 180);
                  const tx = 100 + 58 * Math.cos(midRad);
                  const ty = 100 + 58 * Math.sin(midRad);
                  const rot = (startDeg + endDeg) / 2 + 90;

                  return (
                    <g key={idx}>
                      <path
                        d={`M 100 100 L ${x1} ${y1} A 96 96 0 0 1 ${x2} ${y2} Z`}
                        fill={idx % 2 === 0 ? '#141d3f' : '#0b1024'}
                        stroke="#d4a84b"
                        strokeWidth="0.8"
                      />
                      <text
                        x={tx}
                        y={ty}
                        fill={out.color}
                        fontSize="10"
                        fontWeight="800"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${rot} ${tx} ${ty})`}
                      >
                        {out.label}
                      </text>
                    </g>
                  );
                })}
                <circle cx="100" cy="100" r="18" fill="#fbbf24" stroke="#fffbeb" strokeWidth="2.5" />
              </svg>
            </div>

            {wheelResult ? (
              <div className="text-center">
                <div className="text-sm font-black text-amber-300 mb-3">
                  Nhận được: {wheelResult.label}
                </div>
                <button
                  type="button"
                  onClick={() => onWheelComplete(wheelResult)}
                  className="a2-yellow-btn px-7 py-3 rounded-xl font-black text-sm cursor-pointer whitespace-nowrap"
                >
                  Nhận Thưởng &amp; Tiếp Tục
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={wheelSpinning}
                onClick={handleSpinWheel}
                className="a2-yellow-btn flex items-center gap-2 px-7 py-3 rounded-xl font-black text-sm cursor-pointer disabled:opacity-60 whitespace-nowrap"
              >
                <Disc className="w-4 h-4 shrink-0" />
                <span>{wheelSpinning ? 'Đang Quay...' : 'Quay Vòng May Mắn'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
