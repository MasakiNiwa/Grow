/**
 * AI に渡すアプリの状態（構造化データ）。
 * 数字はアプリが計算したものをそのまま渡し、AI に計算させない。
 */
import { db } from '@/lib/db/db';
import { getInstrument, scaleFamily } from '@/features/assess/registry';
import { levelOf, LEVEL_LABELS, scoreMap } from '@/features/assess/scoring';
import { growTypeOf } from '@/features/assess/instruments/bigfiveTypes';
import { BIG_FIVE_FULL } from '@/features/assess/instruments/bigfive';
import type { AssessmentResult } from '@/features/assess/types';

const scaleById = new Map(BIG_FIVE_FULL.scales.map((s) => [s.id, s]));

/** ビッグファイブの結果を AI 向けに要約する（5 特性・目立つ側面・タイプ） */
export function summarizeBigFive(r: AssessmentResult) {
  const map = scoreMap(r.scores);
  const type = growTypeOf(r.scores);
  const domains = BIG_FIVE_FULL.scales
    .filter((s) => !s.parent)
    .map((s) => ({
      id: s.id,
      name: s.label,
      score: map[s.id]?.pomp ?? null,
      level: LEVEL_LABELS[levelOf(map[s.id]?.pomp ?? 50)],
    }));
  const facets = BIG_FIVE_FULL.scales
    .filter((s) => s.parent && map[s.id])
    .map((s) => ({
      id: s.id,
      name: s.label,
      domain: scaleById.get(s.parent!)!.label,
      score: map[s.id].pomp,
    }))
    .sort((a, b) => b.score - a.score);
  return {
    resultId: r.id,
    date: new Date(r.createdAt).toISOString().slice(0, 10),
    instrument: getInstrument(r.instrumentId)?.title ?? r.instrumentId,
    growType: {
      name: type.name,
      catchphrase: type.catchphrase,
      emotional: type.stable ? '安定' : '繊細',
    },
    domains,
    highestFacets: facets.slice(0, 3),
    lowestFacets: facets.slice(-3).reverse(),
    note: r.note || undefined,
  };
}

export interface AppState {
  now: string;
  page: string;
  assessments: {
    count: number;
    latestBigFive: ReturnType<typeof summarizeBigFive> | null;
  };
}

export async function buildAppState(page: string): Promise<AppState> {
  const results = await db.results.orderBy('createdAt').toArray();
  const latest = [...results].reverse().find((r) => scaleFamily(r.instrumentId) === 'bigfive');
  return {
    now: new Date().toISOString().slice(0, 16),
    page,
    assessments: {
      count: results.length,
      latestBigFive: latest ? summarizeBigFive(latest) : null,
    },
  };
}

export function formatAppState(state: AppState): string {
  return `<app_state>\n${JSON.stringify(state)}\n</app_state>`;
}
