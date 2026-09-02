export interface GachaSlot {
  label: string
  isPrize: boolean
  emoji: string
}

// Exactly 10 slots. Exactly 3 are real prizes.
export const GACHA_SLOTS: GachaSlot[] = [
  { label: 'GIẢM 100.000đ HỌC PHÍ', isPrize: true, emoji: '🎁' },
  { label: 'CHÚC TÌNH YÊU MAY MẮN DỊP GACHA MỚI =))', isPrize: false, emoji: '❤️' },
  { label: 'GIẢM 50.000đ HỌC PHÍ', isPrize: true, emoji: '🎁' },
  { label: 'ĐỘC LẬP RỒI, ĐỘC THÂN THÌ CHƯA BIẾT.', isPrize: false, emoji: '🇻🇳' },
  { label: 'QUÀ CHƯA TỚI, NGƯỜI YÊU CŨNG CHƯA.', isPrize: false, emoji: '💔' },
  { label: 'TẶNG 1 BUỔI HỌC WRITING 1-1', isPrize: true, emoji: '🎁' },
  { label: 'SUÝT TRÚNG RỒI =))', isPrize: false, emoji: '😂' },
  { label: 'CHÚC BẠN SỚM CÓ NGƯỜI YÊU.', isPrize: false, emoji: '🌹' },
  { label: 'VŨ TRỤ BẢO QUAY LẠI LẦN SAU.', isPrize: false, emoji: '🥲' },
  { label: 'KHÔNG CÓ QUÀ NHƯNG CÓ LỜI CHÚC.', isPrize: false, emoji: '🫶' },
]
