import { getInstrument, scaleFamily } from '@/features/assess/registry';
import { scoreAnswers } from '@/features/assess/scoring';
import type { AssessmentResult, ScaleScore } from '@/features/assess/types';
import type { PracticeLog, PracticeKind } from '@/features/practice/types';
import { conditionSummary, correlationMatrix, dailyTable, learningByCategory } from './condition';

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

export interface PracticeSummary {
  /** 週ごと（月曜始まり）・種類ごとの回数 */
  weekly: { week: string; counts: Partial<Record<PracticeKind, number>> }[];
  /** ロールプレイの得点率（%）の推移（選択式・AI） */
  roleplay: { at: number; scenarioId: string; ratio: number; kind: 'roleplay' | 'ai-roleplay' }[];
  /** 考え方の整理で、気持ちの強さが平均どれだけ下がったか */
  reframe: { count: number; averageDrop: number | null };
  /** よく選ばれた考え方のくせ（多い順） */
  distortions: { name: string; count: number }[];
}

/** その週の月曜日（YYYY-MM-DD） */
export function weekStart(ms: number): string {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 練習の記録を集計する */
export function practiceSummary(logs: PracticeLog[]): PracticeSummary {
  const sorted = [...logs].sort((a, b) => a.createdAt - b.createdAt);
  const weeks = new Map<string, Partial<Record<PracticeKind, number>>>();
  const distortions = new Map<string, number>();
  const roleplay: PracticeSummary['roleplay'] = [];
  const drops: number[] = [];
  for (const log of sorted) {
    const w = weekStart(log.createdAt);
    const c = weeks.get(w) ?? {};
    c[log.kind] = (c[log.kind] ?? 0) + 1;
    weeks.set(w, c);
    if (log.kind === 'roleplay' && log.data.maxScore > 0) {
      roleplay.push({
        at: log.createdAt,
        scenarioId: log.data.scenarioId,
        ratio: Math.round((log.data.score / log.data.maxScore) * 100),
        kind: 'roleplay',
      });
    }
    if (log.kind === 'ai-roleplay' && log.data.feedback?.score !== undefined) {
      roleplay.push({
        at: log.createdAt,
        scenarioId: log.data.scenarioId,
        ratio: log.data.feedback.score,
        kind: 'ai-roleplay',
      });
    }
    if (log.kind === 'reframe') {
      drops.push(log.data.before - log.data.after);
      for (const d of log.data.distortions) distortions.set(d, (distortions.get(d) ?? 0) + 1);
    }
  }
  return {
    weekly: [...weeks.entries()].map(([week, counts]) => ({ week, counts })),
    roleplay,
    reframe: {
      count: drops.length,
      averageDrop: drops.length
        ? Math.round((drops.reduce((a, b) => a + b, 0) / drops.length) * 10) / 10
        : null,
    },
    distortions: [...distortions.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export const analysisApi = {
  score,
  trend,
  compare,
  responseStyle,
  practiceSummary,
  conditionSummary,
  dailyTable,
  correlationMatrix,
  learningByCategory,
};
export type AnalysisApi = typeof analysisApi;
