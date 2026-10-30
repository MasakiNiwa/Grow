/**
 * 診断（知る）の共通の型。
 * 診断を増やすときは Instrument を 1 つ作り、registry.ts に登録する（画面・採点・記録・分析は共通で動く）。
 */

/** 尺度（ビッグファイブなら 5 つの領域と、その下の側面） */
export interface ScaleDef {
  id: string;
  label: string;
  /** 上位の尺度（領域の下の側面なら領域の id）。無ければ最上位 */
  parent?: string;
  description: string;
  /** 低いときの言い方・高いときの言い方（グラフの両端など） */
  lowLabel: string;
  highLabel: string;
}

export interface ItemDef {
  id: string;
  text: string;
  /** いちばん下の尺度（側面）の id */
  scale: string;
  /** 1: そのまま、-1: 逆転項目 */
  keyed: 1 | -1;
}

export interface ResponseOption {
  value: number;
  label: string;
  /** スマホの狭いボタンに出す短い言い方 */
  short: string;
}

export type InstrumentCategory = 'personality' | 'aptitude' | 'values' | 'cognitive';

export interface Instrument {
  id: string;
  /** 設問や採点を変えたら上げる（古い結果と見分けるため） */
  version: number;
  category: InstrumentCategory;
  title: string;
  /** 一覧で出す短い説明 */
  summary: string;
  /** はじめる前に出す説明 */
  intro: string;
  minutes: number;
  options: ResponseOption[];
  scales: ScaleDef[];
  items: ItemDef[];
  /** 出典・ライセンス（ヘルプのクレジットにも出す） */
  source: string;
}

/** 尺度ごとの得点 */
export interface ScaleScore {
  scaleId: string;
  /** 回答の平均（逆転済み。選択肢の値の範囲） */
  mean: number;
  /** 0〜100 に直した値（POMP: 取りうる範囲の何 % の位置か） */
  pomp: number;
  /** 答えた設問の数・設問の数 */
  answered: number;
  total: number;
}

export interface AssessmentResult {
  id: string;
  instrumentId: string;
  instrumentVersion: number;
  createdAt: number;
  /** 答えるのにかかった時間（ミリ秒） */
  durationMs: number;
  answers: Record<string, number>;
  scores: ScaleScore[];
  /** メモ（あとで書き足せる） */
  note?: string;
}

/** 途中まで答えた診断（ページを離れても続きから） */
export interface AssessmentDraft {
  instrumentId: string;
  instrumentVersion: number;
  answers: Record<string, number>;
  /** 出題の順番（設問 id） */
  order: string[];
  startedAt: number;
  updatedAt: number;
}
