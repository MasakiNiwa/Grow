import type { Instrument, ScaleScore } from './types';

/** 尺度の水準（解説やタイプ分けに使う） */
export type Level = 'low' | 'mid' | 'high';

export function levelOf(pomp: number): Level {
  if (pomp < 40) return 'low';
  if (pomp > 60) return 'high';
  return 'mid';
}

export const LEVEL_LABELS: Record<Level, string> = { low: '低め', mid: '中くらい', high: '高め' };

function range(inst: Instrument): { min: number; max: number } {
  const values = inst.options.map((o) => o.value);
  return { min: Math.min(...values), max: Math.max(...values) };
}

/** 逆転項目を戻した値 */
export function keyedValue(inst: Instrument, keyed: 1 | -1, value: number): number {
  const { min, max } = range(inst);
  return keyed === 1 ? value : min + max - value;
}

/** 尺度 id → その尺度に含まれる設問（下位の尺度の設問も含む） */
export function itemsOfScale(inst: Instrument, scaleId: string) {
  const ids = new Set([scaleId]);
  // 下位の尺度を集める（深さは問わない）
  let grew = true;
  while (grew) {
    grew = false;
    for (const s of inst.scales) {
      if (s.parent && ids.has(s.parent) && !ids.has(s.id)) {
        ids.add(s.id);
        grew = true;
      }
    }
  }
  return inst.items.filter((i) => ids.has(i.scale));
}

/**
 * 回答から、すべての尺度の得点を計算する（純粋な関数。Worker でも画面でも使う）。
 * 答えていない設問は除いて平均する。1 問も答えていない尺度は中央の値にする。
 */
export function scoreAnswers(inst: Instrument, answers: Record<string, number>): ScaleScore[] {
  const { min, max } = range(inst);
  return inst.scales.map((scale) => {
    const items = itemsOfScale(inst, scale.id);
    const values = items
      .filter((i) => answers[i.id] !== undefined)
      .map((i) => keyedValue(inst, i.keyed, answers[i.id]));
    const mean = values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : (min + max) / 2;
    return {
      scaleId: scale.id,
      mean,
      pomp: Math.round(((mean - min) / (max - min)) * 1000) / 10,
      answered: values.length,
      total: items.length,
    };
  });
}

export function scoreMap(scores: ScaleScore[]): Record<string, ScaleScore> {
  return Object.fromEntries(scores.map((s) => [s.scaleId, s]));
}
