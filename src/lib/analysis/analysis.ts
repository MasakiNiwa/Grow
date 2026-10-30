import { getInstrument, scaleFamily } from '@/features/assess/registry';
import { scoreAnswers } from '@/features/assess/scoring';
import type { AssessmentResult, ScaleScore } from '@/features/assess/types';

/**
 * 分析の計算（純粋な関数）。Worker（analysis.worker.ts）から呼ぶほか、Worker が使えない環境ではそのまま使う。
 * 重くなりうる計算（大量の記録の集計・統計）はここに足していく。
 */

export function score(instrumentId: string, answers: Record<string, number>): ScaleScore[] {
  const inst = getInstrument(instrumentId);
  if (!inst) throw new Error(`unknown instrument: ${instrumentId}`);
  return scoreAnswers(inst, answers);
}

export interface TrendPoint {
  resultId: string;
  createdAt: number;
  instrumentId: string;
  pomp: Record<string, number>;
}

/** 同じ尺度のまとまりの結果を、古い順の時系列にする */
export function trend(results: AssessmentResult[], family: string): TrendPoint[] {
  return results
    .filter((r) => scaleFamily(r.instrumentId) === family)
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((r) => ({
      resultId: r.id,
      createdAt: r.createdAt,
      instrumentId: r.instrumentId,
      pomp: Object.fromEntries(r.scores.map((s) => [s.scaleId, s.pomp])),
    }));
}

export interface ScaleDiff {
  scaleId: string;
  before: number;
  after: number;
  diff: number;
}

/** 2 つの結果の差（大きく変わった順） */
export function compare(before: AssessmentResult, after: AssessmentResult): ScaleDiff[] {
  const a = new Map(before.scores.map((s) => [s.scaleId, s.pomp]));
  return after.scores
    .filter((s) => a.has(s.scaleId))
    .map((s) => ({
      scaleId: s.scaleId,
      before: a.get(s.scaleId)!,
      after: s.pomp,
      diff: Math.round((s.pomp - a.get(s.scaleId)!) * 10) / 10,
    }))
    .sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff));
}

/** 回答の偏り（同じ選択肢ばかり・極端な回答ばかり）を調べる。結果の信頼度の目安 */
export function responseStyle(answers: Record<string, number>): {
  sameRatio: number;
  extremeRatio: number;
  middleRatio: number;
} {
  const values = Object.values(answers);
  if (values.length === 0) return { sameRatio: 0, extremeRatio: 0, middleRatio: 0 };
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const max = Math.max(...counts.values());
  return {
    sameRatio: max / values.length,
    extremeRatio: values.filter((v) => v === 1 || v === 5).length / values.length,
    middleRatio: values.filter((v) => v === 3).length / values.length,
  };
}

export const analysisApi = { score, trend, compare, responseStyle };
export type AnalysisApi = typeof analysisApi;
