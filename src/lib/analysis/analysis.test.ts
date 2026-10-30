import { describe, expect, it } from 'vitest';
import type { AssessmentResult } from '@/features/assess/types';
import { compare, responseStyle, score, trend } from './analysis';

const result = (
  id: string,
  createdAt: number,
  pomp: Record<string, number>,
  instrumentId = 'bigfive-60',
): AssessmentResult => ({
  id,
  instrumentId,
  instrumentVersion: 1,
  createdAt,
  durationMs: 1,
  answers: {},
  scores: Object.entries(pomp).map(([scaleId, p]) => ({
    scaleId,
    pomp: p,
    mean: 3,
    answered: 1,
    total: 1,
  })),
});

describe('分析', () => {
  it('score は登録された診断で採点する', () => {
    expect(score('bigfive-60', {}).length).toBeGreaterThan(30);
    expect(() => score('unknown', {})).toThrow();
  });

  it('trend は同じ尺度のまとまりだけを古い順に並べる（クイック版とじっくり版は同じ）', () => {
    const points = trend(
      [
        result('b', 2, { E: 60 }, 'bigfive-120'),
        result('a', 1, { E: 40 }),
        result('x', 3, { E: 1 }, 'other'),
      ],
      'bigfive',
    );
    expect(points.map((p) => p.resultId)).toEqual(['a', 'b']);
    expect(points[1].pomp.E).toBe(60);
  });

  it('compare は変化の大きい順', () => {
    const diffs = compare(result('a', 1, { E: 50, A: 50 }), result('b', 2, { E: 55, A: 30 }));
    expect(diffs.map((d) => d.scaleId)).toEqual(['A', 'E']);
    expect(diffs[0].diff).toBe(-20);
  });

  it('responseStyle は回答の偏りを数える', () => {
    const s = responseStyle({ a: 3, b: 3, c: 5, d: 1 });
    expect(s.sameRatio).toBe(0.5);
    expect(s.extremeRatio).toBe(0.5);
    expect(s.middleRatio).toBe(0.5);
  });
});
