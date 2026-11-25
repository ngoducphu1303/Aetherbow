import type { DefeatCauseInfo } from '../types/game';

/**
 * Post-Defeat Tactical Diagnostics Engine.
 * Evaluates real match telemetry (power gap, dodge ratio, Boss interrupts,
 * arena mechanism usage, and lethal hit metadata) to pinpoint the primary
 * failure cause and generate 2 concrete actionable recommendations.
 */

export type TacticalRecommendationTarget = 'retry' | 'gear' | 'talents' | 'codex';

export type DefeatCauseCategory =
  | 'power_gap'
  | 'missed_interrupts'
  | 'dodge_timing'
  | 'unused_mechanisms'
  | 'sustained_attrition';

export interface DefeatDiagnosticMetric {
  id: string;
  label: string;
  value: string;
  target: string;
  status: 'good' | 'warn' | 'critical';
}

export interface DefeatTacticalRecommendation {
  id: string;
  title: string;
  detail: string;
  actionLabel: string;
  actionTarget: TacticalRecommendationTarget;
}

export interface DefeatDiagnosticInput {
  chapterId: number;
  stageReached: number;
  totalStages: number;
  playerPowerRating: number;
  recommendedChapterPower: number;
  elapsedSeconds: number;
  perfectDodges: number;
  damageTakenCount: number;
  castInterrupts: number;
  bossGuardBreaks: number;
  arenaMechanismsTriggered: number;
  defeatCause?: DefeatCauseInfo;
}

export interface DefeatDiagnosticReport {
  primaryCauseId: DefeatCauseCategory;
  primaryCauseTitle: string;
  primaryCauseSummary: string;
  severityLabel: string;
  powerRatioPct: number;
  metrics: DefeatDiagnosticMetric[];
  recommendations: [DefeatTacticalRecommendation, DefeatTacticalRecommendation];
}

export function analyzeDefeatDiagnostics(input: DefeatDiagnosticInput): DefeatDiagnosticReport {
  const safePlayerCp = Math.max(1, Math.round(input.playerPowerRating || 0));
  const safeRecCp = Math.max(1, Math.round(input.recommendedChapterPower || 1));
  const powerRatio = safePlayerCp / safeRecCp;
  const powerRatioPct = Math.round(powerRatio * 100);

  const stage = Math.max(1, Math.floor(input.stageReached || 1));
  const totalStages = Math.max(1, Math.floor(input.totalStages || 12));
  const isBossOrLateStage = stage >= Math.max(4, totalStages - 1) || Boolean(input.defeatCause?.isBoss);

  const perfectDodges = Math.max(0, Math.floor(input.perfectDodges || 0));
  const damageTaken = Math.max(0, Math.floor(input.damageTakenCount || 0));
  const castInterrupts = Math.max(0, Math.floor(input.castInterrupts || 0));
  const bossBreaks = Math.max(0, Math.floor(input.bossGuardBreaks || 0));
  const mechanisms = Math.max(0, Math.floor(input.arenaMechanismsTriggered || 0));
  const elapsedSec = Math.max(1, Math.round(input.elapsedSeconds || 0));

  // Score each potential failure cause from real run telemetry
  let primaryCauseId: DefeatCauseCategory = 'sustained_attrition';
  let primaryCauseTitle = 'Áp lực giao tranh kéo dài';
  let primaryCauseSummary = `Bạn đã trụ được ${elapsedSec}s tới Phòng ${stage}/${totalStages}, nhưng lượng sát thương cộng dồn cuối trận vượt quá hồi phục.`;
  let severityLabel = 'Cần tối ưu nhịp đánh';

  if (powerRatio < 0.78) {
    primaryCauseId = 'power_gap';
    primaryCauseTitle = 'Chênh lệch Lực Chiến đáng kể';
    primaryCauseSummary = `Lực chiến hiện tại (${safePlayerCp.toLocaleString('vi-VN')} CP) mới đạt ${powerRatioPct}% mức khuyến nghị Chương ${input.chapterId} (${safeRecCp.toLocaleString('vi-VN')} CP), khiến thời gian hạ quái kéo dài.`;
    severityLabel = `Thiếu ${Math.max(1, 100 - powerRatioPct)}% CP khuyến nghị`;
  } else if (isBossOrLateStage && castInterrupts === 0 && bossBreaks === 0) {
    primaryCauseId = 'missed_interrupts';
    primaryCauseTitle = 'Bỏ lỡ cửa sổ Ngắt Chiêu & Phá Giáp Boss';
    primaryCauseSummary =
      'Boss tung trọn chuỗi kỹ năng diện rộng vì chưa bị Ngắt Chiêu khi gồng hoặc Phá Giáp ở mốc 65% / 30% HP.';
    severityLabel = 'Ưu tiên Ngắt Chiêu Boss';
  } else if (damageTaken >= 5 && perfectDodges <= 1) {
    primaryCauseId = 'dodge_timing';
    primaryCauseTitle = 'Trúng nhiều đòn cảnh báo cần Lướt Né';
    primaryCauseSummary = `Nhận ${damageTaken} đòn đánh nhưng chỉ có ${perfectDodges} lần Né Hoàn Hảo. Căn thời điểm Lướt Né ngay khi vòng cảnh báo đầy sẽ miễn thương và kích hoạt Phản Đòn.`;
    severityLabel = 'Cải thiện nhịp Lướt Né';
  } else if (mechanisms === 0 && stage >= 2) {
    primaryCauseId = 'unused_mechanisms';
    primaryCauseTitle = 'Chưa tận dụng Cơ Quan Đấu Trường';
    primaryCauseSummary = `Chưa kích hoạt Cơ Quan Hoàng Đạo nào trong suốt ${stage} phòng. Bắn hoặc áp sát trụ cơ quan giúp gây choáng diện rộng, hồi phục và tăng tốc bắn miễn phí.`;
    severityLabel = 'Kích hoạt Cơ Quan';
  }

  const metrics: DefeatDiagnosticMetric[] = [
    {
      id: 'power_ratio',
      label: 'Tỷ lệ Lực Chiến',
      value: `${powerRatioPct}% (${safePlayerCp.toLocaleString('vi-VN')})`,
      target: `Khuyến nghị: ${safeRecCp.toLocaleString('vi-VN')} CP`,
      status: powerRatio >= 0.92 ? 'good' : powerRatio >= 0.78 ? 'warn' : 'critical',
    },
    {
      id: 'dodge_ratio',
      label: 'Né Hoàn Hảo / Trúng đòn',
      value: `${perfectDodges} né · ${damageTaken} trúng`,
      target: 'Mục tiêu: ≥ 2 Né Hoàn Hảo',
      status: perfectDodges >= 2 ? 'good' : damageTaken >= 5 ? 'critical' : 'warn',
    },
    {
      id: 'interrupts',
      label: 'Ngắt Chiêu / Phá Giáp',
      value: `${castInterrupts} ngắt · ${bossBreaks} phá giáp`,
      target: isBossOrLateStage ? 'Boss: ≥ 1 Ngắt Chiêu' : 'Mục tiêu: Ngắt quái gồng',
      status:
        castInterrupts + bossBreaks >= 1 ? 'good' : isBossOrLateStage ? 'critical' : 'warn',
    },
    {
      id: 'mechanisms',
      label: 'Cơ Quan Đấu Trường',
      value: `${mechanisms} lần kích hoạt`,
      target: 'Mục tiêu: ≥ 1 mỗi trận',
      status: mechanisms >= 1 ? 'good' : 'warn',
    },
  ];

  const recommendationsByCause: Record<
    DefeatCauseCategory,
    [DefeatTacticalRecommendation, DefeatTacticalRecommendation]
  > = {
    power_gap: [
      {
        id: 'rec_upgrade_gear',
        title: 'Cường hóa Vũ khí & Giáp chính',
        detail: 'Tập trung dồn Vàng vào Vũ khí và Áo giáp để tăng ngay lực sát thương lẫn sinh lực nền.',
        actionLabel: 'Mở Trang Bị',
        actionTarget: 'gear',
      },
      {
        id: 'rec_upgrade_talents',
        title: 'Nâng Thiên Phú sinh tồn & công kích',
        detail: 'Kích hoạt thêm điểm Thiên Phú giúp rút ngắn chênh lệch chỉ số trước khi tái đấu.',
        actionLabel: 'Mở Thiên Phú',
        actionTarget: 'talents',
      },
    ],
    missed_interrupts: [
      {
        id: 'rec_codex_boss',
        title: 'Xem mẫu đòn 3 Pha & mẹo Ngắt Chiêu',
        detail: 'Giữ Kỹ năng Chủ động hoặc đòn Phản Đòn để bắn vào vòng gồng vàng của Boss, thưởng +22% Phá Giáp.',
        actionLabel: 'Mở Sổ Tay Boss',
        actionTarget: 'codex',
      },
      {
        id: 'rec_retry_interrupt',
        title: 'Tái đấu & canh nhịp Pha 65% / 30%',
        detail: 'Lùi khỏi tầm xoáy khi Boss đổi pha rồi dồn sát thương trong cửa sổ Suy Yếu +20%.',
        actionLabel: 'Thử Lại Ngay',
        actionTarget: 'retry',
      },
    ],
    dodge_timing: [
      {
        id: 'rec_retry_dodge',
        title: 'Giữ Lướt Né cho vòng cảnh báo đỏ',
        detail: 'Ưu tiên di chuyển vòng cung quanh cột đá và bấm Lướt Né sát thời điểm đòn nổ để kích hoạt Phản Đòn.',
        actionLabel: 'Luyện Lại Ngay',
        actionTarget: 'retry',
      },
      {
        id: 'rec_gear_defense',
        title: 'Gia cố Sinh Lực & Bộ Trang Bị',
        detail: 'Nâng cấp Giáp/Nhẫn hoặc kích hoạt bộ Long Kỵ để có thêm lớp khiên bảo vệ khi máu thấp.',
        actionLabel: 'Xem Trang Bị',
        actionTarget: 'gear',
      },
    ],
    unused_mechanisms: [
      {
        id: 'rec_retry_mech',
        title: 'Bắn mở Cơ Quan Đấu Trường sớm',
        detail: 'Dụ nhóm quái lại gần trụ Hoàng Đạo rồi bắn kích nổ để tạo choáng diện rộng và lấy bùa tốc bắn.',
        actionLabel: 'Vào Trận Lại',
        actionTarget: 'retry',
      },
      {
        id: 'rec_codex_mech',
        title: 'Tra cứu Cơ Quan & Tiến Hóa Kỹ Năng',
        detail: 'Chọn nhánh Tiến Hóa Diện Rộng hoặc Đánh Boss phù hợp với kiểu phòng hiện tại.',
        actionLabel: 'Mở Sổ Tay',
        actionTarget: 'codex',
      },
    ],
    sustained_attrition: [
      {
        id: 'rec_gear_dps',
        title: 'Tối ưu Vũ khí & Hiệu Ứng Bộ',
        detail: 'Trang bị đủ 2–3 món cùng Bộ (Hủy Diệt, Vọng Âm, Oracle) để mở khóa hiệu ứng kích nổ trong giao tranh.',
        actionLabel: 'Mở Trang Bị',
        actionTarget: 'gear',
      },
      {
        id: 'rec_retry_tactical',
        title: 'Tái đấu với nhánh Tiến Hóa khắc chế',
        detail: 'Dọn nhóm Pháp sư/Xạ thủ tuyến sau trước khi dồn sát thương vào Tiên phong và Thủ lĩnh.',
        actionLabel: 'Thử Lại Ngay',
        actionTarget: 'retry',
      },
    ],
  };

  return {
    primaryCauseId,
    primaryCauseTitle,
    primaryCauseSummary,
    severityLabel,
    powerRatioPct,
    metrics,
    recommendations: recommendationsByCause[primaryCauseId],
  };
}
