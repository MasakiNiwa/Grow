/** 日々のチェックイン（気分・エネルギー・ストレス・睡眠・できごとのタグ・メモ） */
export interface Checkin {
  id: string;
  /** その日（YYYY-MM-DD。端末の時刻） */
  date: string;
  createdAt: number;
  /** 1〜5（5 がいちばん良い） */
  mood: number;
  /** 1〜5（5 が元気） */
  energy: number;
  /** 1〜5（5 がストレスが強い） */
  stress: number;
  /** 睡眠時間（時間。任意） */
  sleep?: number;
  tags: string[];
  note?: string;
}

/** できごとのタグ（自分で足すこともできる） */
export const DEFAULT_TAGS = [
  '仕事',
  '勉強',
  '人間関係',
  '家族',
  '運動',
  '趣味',
  '休み',
  '体調不良',
  '寝不足',
  '褒められた',
  '失敗した',
  '挑戦した',
];

export const MOOD_FACES = ['😞', '🙁', '😐', '🙂', '😄'];

export const METRIC_LABELS = {
  mood: '気分',
  energy: 'エネルギー',
  stress: 'ストレス',
  sleep: '睡眠',
} as const;

export function localDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
