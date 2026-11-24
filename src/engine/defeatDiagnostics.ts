import type { DefeatCauseInfo } from '../types/game';

export type TacticalFailureCauseCode =
  | 'power_gap'
  | 'missed_boss_interrupt'
  | 'telegraph_dodge_deficit'
  | 'unused_arena_mechanism'
  | 'swarm_positioning';

export type TacticalRecommendationTarget =
  | 'gear'
  | 'talents'
  | 'retry'
  | 'training'
  | 'codex';

export interface TacticalDiagnosticMetric {
  id: string;
  label: string;
  value: string;
  target: string;
  status: 'ok' | 'warn' | 'critical';
}

export interface TacticalRecommendation {
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
  bossInterruptOpportunities?: number;
  arenaMechanismsTriggered: number;
  defeatCause?: DefeatCauseInfo;
}

export interface DefeatDiagnosticReport {
  primaryCauseCode: TacticalFailureCauseCode;
  primaryCauseTitle: string;
  primaryCauseSummary: string;
  severityLabel: string;
  metrics: TacticalDiagnosticMetric[];
  recommendations: [TacticalRecommendation, TacticalRecommendation];
}

function formatNumber(n: number): string {
  return Math.max(0, Math.round(n)).toLocaleString('vi-VN');
}

/**
 * Pure Tactical Failure-Cause Diagnostics analyzer (Phase 4 Pillar 3).
 * Inspects real match telemetry (CP gap, dodge efficiency, Boss interrupt windows,
 * arena mechanism usage, and defeatCause) to identify the primary failure cause
 * and generate 2 concrete actionable recommendations.
 */
export function analyzeDefeatDiagnostics(input: DefeatDiagnosticInput): DefeatDiagnosticReport {
  const playerCp = Math.max(0, Math.round(input.playerPowerRating || 0));
  const recCp = Math.max(100, Math.round(input.recommendedChapterPower || 400));
  const cpRatio = playerCp / recCp;
  const perfectDodges = Math.max(0, Math.floor(input.perfectDodges || 0));
  const damageTakenCount = Math.max(0, Math.floor(input.damageTakenCount || 0));
  const castInterrupts = Math.max(0, Math.floor(input.castInterrupts || 0));
  const bossGuardBreaks = Math.max(0, Math.floor(input.bossGuardBreaks || 0));
  const mechanismsUsed = Math.max(0, Math.floor(input.arenaMechanismsTriggered || 0));
  const elapsedSec = Math.max(1, Math.round(input.elapsedSeconds || 1));

  const causeCode = input.defeatCause?.code ?? 'unknown';
  const isBossCause =
    causeCode === 'boss_slam' ||
    causeCode === 'boss_lane' ||
    causeCode === 'boss_projectile' ||
    causeCode === 'boss_contact' ||
    input.stageReached >= input.totalStages;

  const bossInterruptOpps = Math.max(
    isBossCause ? 1 : 0,
    Math.floor(input.bossInterruptOpportunities ?? (isBossCause ? Math.max(1, Math.floor(elapsedSec / 22)) : 0))
  );

  const dodgeSuccessRate =
    perfectDodges + damageTakenCount > 0
      ? perfectDodges / (perfectDodges + damageTakenCount)
      : 0;
  const dodgeRatePct = Math.round(dodgeSuccessRate * 100);

  let primaryCauseCode: TacticalFailureCauseCode;
  let primaryCauseTitle: string;
  let primaryCauseSummary: string;
  let severityLabel: string;

  if (cpRatio < 0.82) {
    primaryCauseCode = 'power_gap';
    primaryCauseTitle = 'Chênh lệch lực chiến đáng kể';
    primaryCauseSummary = `Lực chiến hiện tại (${formatNumber(playerCp)}) thấp hơn ${Math.round(
      (1 - cpRatio) * 100
    )}% so với ngưỡng đề xuất Chương ${input.chapterId} (${formatNumber(recCp)}), khiến thời gian hạ mục tiêu kéo dài và dễ hụt máu.`;
    severityLabel = 'Ưu tiên nâng chỉ số';
  } else if (isBossCause && castInterrupts === 0 && bossGuardBreaks === 0 && bossInterruptOpps >= 1) {
    primaryCauseCode = 'missed_boss_interrupt';
    primaryCauseTitle = 'Bỏ lỡ cửa sổ Ngắt Chiêu Boss';
    primaryCauseSummary = `Trận đấu ghi nhận ${castInterrupts} lần Ngắt Chiêu và ${bossGuardBreaks} lần Phá Giáp Boss. Giữ Tuyệt Kỹ hoặc Đòn Phản Kích để ngắt vòng tụ chiêu đỏ/tím sẽ khóa Boss và cộng +28% sát thương.`;
    severityLabel = 'Chìa khóa hạ Boss';
  } else if (
    (causeCode === 'boss_slam' || causeCode === 'boss_lane' || causeCode === 'ranged_barrage') ||
    (damageTakenCount >= 4 && dodgeSuccessRate < 0.25)
  ) {
    primaryCauseCode = 'telegraph_dodge_deficit';
    primaryCauseTitle = 'Chưa né kịp đòn cảnh báo trên sàn';
    primaryCauseSummary = `Bạn trúng ${damageTakenCount} đòn trong khi chỉ kích hoạt ${perfectDodges} lần Né Hoàn Hảo (${dodgeRatePct}%). Lướt ngang khỏi vòng tròn/đường chiếu ở 20% giây cuối sẽ mở cửa sổ Phản Kích ×2.`;
    severityLabel = 'Cần tối ưu di chuyển';
  } else if (mechanismsUsed === 0 && elapsedSec >= 25) {
    primaryCauseCode = 'unused_arena_mechanism';
    primaryCauseTitle = 'Chưa kích hoạt Cơ Quan Đấu Trường';
    primaryCauseSummary = `Chưa có Cơ Quan Đấu Trường nào được kích hoạt trong ${elapsedSec} giây chiến đấu. Chạm hoặc bắn kích hoạt trụ cơ quan giúp hồi máu/khiên, làm choáng quái và tăng tốc đánh tức thì.`;
    severityLabel = 'Tận dụng địa hình';
  } else {
    primaryCauseCode = 'swarm_positioning';
    primaryCauseTitle = 'Bị áp sát bởi đàn quái & hỏa lực chéo';
    primaryCauseSummary = `Mất nhịp giữ khoảng cách ở Ải ${input.stageReached}/${Math.max(
      1,
      input.totalStages
    )}. Ưu tiên di chuyển vòng cung quanh rìa sân và chọn nhánh Tiến Hóa AoE để dọn quái tầm xa trước.`;
    severityLabel = 'Điều chỉnh vị trí';
  }

  const metrics: TacticalDiagnosticMetric[] = [
    {
      id: 'cp_gap',
      label: 'Lực chiến / Đề xuất',
      value: `${formatNumber(playerCp)} / ${formatNumber(recCp)}`,
      target: cpRatio >= 1 ? 'Đạt chuẩn' : `Thiếu ${formatNumber(recCp - playerCp)}`,
      status: cpRatio >= 0.95 ? 'ok' : cpRatio >= 0.82 ? 'warn' : 'critical',
    },
    {
      id: 'dodge_rate',
      label: 'Né Hoàn Hảo / Trúng đòn',
      value: `${perfectDodges} / ${damageTakenCount} (${dodgeRatePct}%)`,
      target: 'Mục tiêu ≥ 25%',
      status: dodgeSuccessRate >= 0.28 || damageTakenCount <= 2 ? 'ok' : dodgeSuccessRate >= 0.15 ? 'warn' : 'critical',
    },
    {
      id: 'interrupts',
      label: 'Ngắt Chiêu / Phá Giáp Boss',
      value: `${castInterrupts} / ${bossGuardBreaks}`,
      target: isBossCause ? 'Tối thiểu 1 lần' : 'Khuyến nghị 1+',
      status: castInterrupts + bossGuardBreaks >= 1 ? 'ok' : isBossCause ? 'critical' : 'warn',
    },
    {
      id: 'mechanisms',
      label: 'Cơ Quan Đấu Trường',
      value: `${mechanismsUsed} lần`,
      target: 'Kích hoạt khi hồi',
      status: mechanismsUsed >= 1 ? 'ok' : elapsedSec >= 25 ? 'warn' : 'ok',
    },
  ];

  const recommendations = buildRecommendationsForCause(primaryCauseCode, input.chapterId, cpRatio);

  return {
    primaryCauseCode,
    primaryCauseTitle,
    primaryCauseSummary,
    severityLabel,
    metrics,
    recommendations,
  };
}

function buildRecommendationsForCause(
  cause: TacticalFailureCauseCode,
  chapterId: number,
  cpRatio: number
): [TacticalRecommendation, TacticalRecommendation] {
  switch (cause) {
    case 'power_gap':
      return [
        {
          id: 'rec_upgrade_gear',
          title: 'Cường hóa Vũ Khí & Áo Giáp bậc cao nhất',
          detail: 'Dùng Vàng và Mảnh Rèn vừa nhận để nâng ô Vũ Khí/Giáp và kích hoạt tối thiểu mốc 2 món Bộ Trang Bị.',
          actionLabel: 'Mở Trang Bị',
          actionTarget: 'gear',
        },
        {
          id: 'rec_upgrade_talents',
          title: 'Nâng 2–3 tầng Thiên Phú Sinh Lực & Công Kích',
          detail: `Bổ sung chỉ số nền vĩnh viễn trước khi quay lại Chương ${chapterId} để rút ngắn thời gian hạ Boss.`,
          actionLabel: 'Mở Thiên Phú',
          actionTarget: 'talents',
        },
      ];
    case 'missed_boss_interrupt':
      return [
        {
          id: 'rec_save_ult_interrupt',
          title: 'Giữ Tuyệt Kỹ để cắt vòng tụ chiêu Boss',
          detail: 'Khi Boss hiện vòng đỏ/tím (Ngắt Chiêu), tung Tuyệt Kỹ hoặc Đòn Phản Kích để hủy chiêu và mở cửa sổ +28% sát thương.',
          actionLabel: 'Thử lại ngay',
          actionTarget: 'retry',
        },
        {
          id: 'rec_check_boss_codex',
          title: 'Xem quy luật chiêu Boss & Nhánh Tiến Hóa Boss',
          detail: 'Ưu tiên nâng nhánh Tiến Hóa Đánh Boss (Thương Nhật Luân, Băng Giá Phá Giáp, Trảm Vương Kiếm Ý) khi lên tầng 2+.',
          actionLabel: 'Sổ Tay Chiến Thuật',
          actionTarget: 'codex',
        },
      ];
    case 'telegraph_dodge_deficit':
      return [
        {
          id: 'rec_practice_dodge',
          title: 'Lướt vuông góc khỏi đường chiếu ở nhịp cuối',
          detail: 'Nhấn Né ngay khi vòng cảnh báo chuyển sáng trắng-vàng để kích hoạt Làm Chậm Thời Gian và phát bắn Phản Kích ×2.',
          actionLabel: 'Thử lại ngay',
          actionTarget: 'retry',
        },
        {
          id: 'rec_defensive_prep',
          title: cpRatio < 1 ? 'Gia cố Giáp & Khiên đầu màn' : 'Tập nhịp Né tại Phòng Tập',
          detail:
            cpRatio < 1
              ? 'Nâng thêm Sinh Lực/Giảm Sát Thương từ Trang Bị hoặc chọn Tiến Hóa Pháo Đài Vệ Tinh để tạo khiên 18% HP.'
              : 'Luyện căn nhịp Né Hoàn Hảo 30 giây trong Phòng Tập hoặc bật Cảnh Báo Tương Phản Cao trong Cài Đặt.',
          actionLabel: cpRatio < 1 ? 'Mở Trang Bị' : 'Mở Thiên Phú',
          actionTarget: cpRatio < 1 ? 'gear' : 'talents',
        },
      ];
    case 'unused_arena_mechanism':
      return [
        {
          id: 'rec_trigger_mechanism',
          title: 'Chủ động kích hoạt Trụ Cơ Quan mỗi 15 giây',
          detail: 'Di chuyển qua vòng sáng Cơ Quan Đấu Trường để nhận hồi máu/khiên, làm choáng quái và tăng tốc bắn.',
          actionLabel: 'Thử lại ngay',
          actionTarget: 'retry',
        },
        {
          id: 'rec_boost_tempo',
          title: 'Nâng Thiên Phú Tốc Chạy & Tốc Đánh',
          detail: 'Tốc độ di chuyển cao giúp bạn xoay vòng kích hoạt cơ quan an toàn mà không bị quái chặn đường.',
          actionLabel: 'Mở Thiên Phú',
          actionTarget: 'talents',
        },
      ];
    case 'swarm_positioning':
    default:
      return [
        {
          id: 'rec_kite_perimeter',
          title: 'Di chuyển vòng cung theo rìa đấu trường',
          detail: 'Tránh bị dồn vào góc tường; ưu tiên hạ quái bắn xa và chọn nhánh Tiến Hóa AoE (Cuồng Phong Loạn Tiễn / Mạng Lưới Bão Tố).',
          actionLabel: 'Thử lại ngay',
          actionTarget: 'retry',
        },
        {
          id: 'rec_gear_upgrade',
          title: 'Kiểm tra Bộ Trang Bị & Cường Hóa nhanh',
          detail: 'Kích hoạt nội tại bộ 2–3 món (như Hủy Diệt hoặc Vọng Âm) để tăng tốc độ dọn đàn quái rõ rệt.',
          actionLabel: 'Mở Trang Bị',
          actionTarget: 'gear',
        },
      ];
  }
}
