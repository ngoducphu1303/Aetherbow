/**
 * 12-Chapter Zodiac World Building & Tactical Chronicle (Criteria 14 & 15).
 * Connects every chapter's ancient lore, guardian faction, Boss identity, arena architecture,
 * and tactical room advice directly to the gameplay loop & Codex.
 */
export interface ZodiacChapterLoreEntry {
  chapterId: number;
  zodiacId: string;
  realmTitle: string;
  factionName: string;
  eraTag: string;
  chronicle: string;
  bossLore: string;
  tacticalTip: string;
}

export const ZODIAC_WORLD_LORE: readonly ZodiacChapterLoreEntry[] = [
  {
    chapterId: 1,
    zodiacId: 'leo',
    realmTitle: 'Thánh Điện Nhật Luân',
    factionName: 'Đoàn Vệ Binh Ánh Dương',
    eraTag: 'Kỷ Nguyên Thái Dương I',
    chronicle:
      'Tâm điểm của 12 Cung Hoàng Đạo, nơi Nhật Luân cổ đại từng soi sáng toàn Tinh Giới trước khi ngọn lửa kiêu hãnh nuốt chửng hội đồng thủ hộ.',
    bossLore:
      'Sư Vương Thái Dương từng là cận vệ trung thành nhất của Aurelia, nay bị nhật thực tha hóa thành lưỡi kiếm thiêu đốt mọi kẻ bước qua cổng đền.',
    tacticalTip:
      'Kích hoạt Trụ Nhật Luân ở hai cánh khi Boss tụ khí để phá giáp và mở cửa sổ phản công.',
  },
  {
    chapterId: 2,
    zodiacId: 'aries',
    realmTitle: 'Hỏa Sơn Sừng Đỏ',
    factionName: 'Chiến Đoàn Dung Nham',
    eraTag: 'Kỷ Nguyên Khai Hỏa II',
    chronicle:
      'Vành đai núi lửa không bao giờ nguội dưới chân dãy Sừng Đỏ, nơi rèn nên những thanh chiến kích đầu tiên của Bellona.',
    bossLore:
      'Hỏa Dương Chiến Vương dẫn đầu đội kỵ binh tro tàn với những cú húc xuyên sàn đấu, thử thách phản xạ né đòn vuông góc của thợ săn.',
    tacticalTip:
      'Dụ Hỏa Dương qua Mạch Dung Nham để gây thiêu đốt kéo dài và rút ngắn thời gian phá giáp.',
  },
  {
    chapterId: 3,
    zodiacId: 'taurus',
    realmTitle: 'Thánh Địa Ngọc Lục Bảo',
    factionName: 'Thủ Vệ Địa Mạch',
    eraTag: 'Kỷ Nguyên Thạch Ngọc III',
    chronicle:
      'Khu rừng cổ thụ hóa ngọc lưu giữ nhịp thở đất mẹ của Sylvia; các cột đá pha lê tại đây có thể phá vỡ để giải phóng sinh lực.',
    bossLore:
      'Địa Thần Kim Ngưu mang lớp giáp ngọc bất hoại, chỉ lộ điểm yếu ngay sau những cú giậm chấn động làm nứt mặt đất.',
    tacticalTip:
      'Dùng đòn Phá Giáp (F) hoặc đạn xuyên để vượt qua Khiên Phía Trước của đội hình phòng ngự.',
  },
  {
    chapterId: 4,
    zodiacId: 'gemini',
    realmTitle: 'Song Thành Ảo Ảnh',
    factionName: 'Hội Pháp Sư Gương Tinh Tú',
    eraTag: 'Kỷ Nguyên Song Kính IV',
    chronicle:
      'Hai tòa tháp phản chiếu lẫn nhau trên tầng mây tinh vân, nơi Thánh Nữ Celeste rèn luyện ma pháp phân thân ánh trăng.',
    bossLore:
      'Thần Vương Song Tử điều khiển cùng lúc hai luồng đạn đối xứng, buộc xạ thủ phải giữ cự ly trung bình để đọc khe hở làn đạn.',
    tacticalTip:
      'Tận dụng kỹ năng Tiến Hóa Bão Tên hoặc Đạn Nảy để dọn nhanh phân thân và pháp sư tầm xa.',
  },
  {
    chapterId: 5,
    zodiacId: 'cancer',
    realmTitle: 'Thủy Cung Nguyệt Triều',
    factionName: 'Hải Vệ Triều Trăng',
    eraTag: 'Kỷ Nguyên Hải Triều V',
    chronicle:
      'Cung điện chìm dưới đại dương ánh trăng, nơi thủy triều lên xuống theo chu kỳ của vầng bán nguyệt cổ.',
    bossLore:
      'Cự Giải Nguyệt Giáp thu mình trong vỏ giáp san hô trước khi tung sóng triều lan tỏa khắp sàn đấu.',
    tacticalTip:
      'Giữ kỹ năng di chuyển để lách khỏi vòng sóng và trừng phạt ngay khi Boss thu vỏ giáp.',
  },
  {
    chapterId: 6,
    zodiacId: 'virgo',
    realmTitle: 'Vườn Sao Trinh Nữ',
    factionName: 'Thánh Vệ Vườn Tinh Tú',
    eraTag: 'Kỷ Nguyên Bích Thảo VI',
    chronicle:
      'Thánh viên kết tinh từ hạt giống ánh sao, nơi mỗi bông hoa lưu giữ một lời thề thanh tẩy bóng tối.',
    bossLore:
      'Tinh Nữ Thánh Vệ dùng kết giới dây leo và tia thánh quang theo nhịp đều đặn như một bản giao hưởng nghiêm khắc.',
    tacticalTip:
      'Ưu tiên tiêu diệt linh thể hỗ trợ trước khi vòng kết giới bao phủ góc chạy.',
  },
  {
    chapterId: 7,
    zodiacId: 'libra',
    realmTitle: 'Điện Cân Bằng',
    factionName: 'Hội Đồng Phán Quyết',
    eraTag: 'Kỷ Nguyên Cán Cân VII',
    chronicle:
      'Đại sảnh nơi hai đĩa cân vàng khổng lồ đo lường ý chí giữa công lý và sức mạnh hủy diệt.',
    bossLore:
      'Phán Quan Thiên Bình đảo ngược nhịp tấn công theo từng giai đoạn máu, trừng phạt những lối đánh đứng yên tham sát thương.',
    tacticalTip:
      'Giữ nhịp đánh xen kẽ di chuyển (stutter-step) để luôn sẵn sàng né tia phán quyết chữ thập.',
  },
  {
    chapterId: 8,
    zodiacId: 'scorpio',
    realmTitle: 'Hoang Mạc Độc Tinh',
    factionName: 'Ẩn Khách Tử Độc',
    eraTag: 'Kỷ Nguyên Đêm Tím VIII',
    chronicle:
      'Sa mạc cát tím lấp lánh tinh thể độc dược, nơi các sát thủ bóng tối ẩn mình chờ thời cơ tập kích.',
    bossLore:
      'Hạt Vương Độc Vĩ dịch chuyển tức thời ra sau lưng mục tiêu và rải vũng độc ăn mòn lá chắn.',
    tacticalTip:
      'Kích hoạt Né Hoàn Hảo đúng lúc Boss hiện hình để phản tiễn chí mạng và tạo khoảng trống an toàn.',
  },
  {
    chapterId: 9,
    zodiacId: 'sagittarius',
    realmTitle: 'Thiên Lộ Xạ Thủ',
    factionName: 'Cung Thủ Sao Băng',
    eraTag: 'Kỷ Nguyên Thiên Lộ IX',
    chronicle:
      'Cầu ánh sáng nối liền chín tầng mây, trường bắn thiêng liêng của những bậc thầy xạ thuật Hoàng Đạo.',
    bossLore:
      'Nhân Mã Thần Xạ sở hữu tầm bắn bao phủ toàn sàn đấu với những loạt tên sao băng khóa đường rút lui.',
    tacticalTip:
      'Lợi dụng cột trụ che chắn loạt tên thường và lướt ngang ngay trước khi mũi tên khóa mục tiêu khai hỏa.',
  },
  {
    chapterId: 10,
    zodiacId: 'capricorn',
    realmTitle: 'Đỉnh Sơn Tinh Tú',
    factionName: 'Cự Nhân Hàn Đỉnh',
    eraTag: 'Kỷ Nguyên Băng Sơn X',
    chronicle:
      'Đỉnh núi băng giá cao nhất Tinh Giới, nơi thời gian gần như đóng băng quanh đài thiên văn cổ.',
    bossLore:
      'Sơn Thần Ma Kết tạo tường băng cắt đôi đấu trường và gọi thiên thạch băng giá nghiền nát đội hình.',
    tacticalTip:
      'Giữ góc thoáng ở trung tâm và dùng kỹ năng Hỏa/Lôi để phá nhanh lớp băng chắn đường.',
  },
  {
    chapterId: 11,
    zodiacId: 'aquarius',
    realmTitle: 'Hải Đài Thiên Thủy',
    factionName: 'Chấp Pháp Lôi Thủy',
    eraTag: 'Kỷ Nguyên Thiên Lôi XI',
    chronicle:
      'Đài phun nước lơ lửng giữa cơn bão điện từ, nơi dòng nước tinh khiết dẫn truyền sấm sét xuyên không gian.',
    bossLore:
      'Thủy Sứ Bảo Bình kết nối các cột lôi điện tạo lưới sét di động ép người chơi liên tục đổi vị trí.',
    tacticalTip:
      'Phá hủy trụ cộng hưởng sớm và giữ Tuyệt Kỹ (Q) cho cửa sổ choáng của Boss ở Pha III.',
  },
  {
    chapterId: 12,
    zodiacId: 'pisces',
    realmTitle: 'Hải Vực Mộng Ảo',
    factionName: 'Tinh Linh Song Ngư',
    eraTag: 'Kỷ Nguyên Thiên Hà XII',
    chronicle:
      'Biên giới cuối cùng nơi đại dương sao hòa vào giấc mộng khởi nguyên của toàn vũ trụ Hoàng Đạo.',
    bossLore:
      'Song Ngư Mộng Chủ hội tụ tinh hoa cả 11 cung trước đó, luân chuyển giữa sóng thủy triều ánh sáng và xoáy tinh hà ở Pha III.',
    tacticalTip:
      'Kết hợp đủ Bộ Trang Bị Endgame + Tiến Hóa Kỹ Năng + Phá Giáp đúng cửa sổ để mở khóa Tinh Tuý Hoàng Đạo.',
  },
] as const;

const LORE_BY_CHAPTER = new Map<number, ZodiacChapterLoreEntry>(
  ZODIAC_WORLD_LORE.map((entry) => [entry.chapterId, entry])
);

export function getZodiacChapterLore(chapterId: number): ZodiacChapterLoreEntry {
  const clamped = Math.max(1, Math.min(12, Math.floor(Number.isFinite(chapterId) ? chapterId : 1)));
  return LORE_BY_CHAPTER.get(clamped) ?? ZODIAC_WORLD_LORE[0];
}
