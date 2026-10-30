import { growTypeOf } from './instruments/bigfiveTypes';
import { RIASEC_TYPES, riasecCode } from './instruments/riasec';
import { VALUES, VALUE_IDS } from './instruments/values';
import { scaleFamily } from './registry';
import type { AssessmentResult, ScaleScore } from './types';

const valueLabel = new Map(VALUES.scales.map((s) => [s.id, s.label]));
const riasecLabel = new Map<string, string>(
  RIASEC_TYPES.map((t) => [t.id, t.label.replace(/（.*）/, '')]),
);

/**
 * 価値観の相対的な順位。「どれも大切」と答えがちなので、その人の全体の平均との差で並べる（イプサティブ化）。
 */
export function rankedValues(
  scores: ScaleScore[],
): { id: string; label: string; pomp: number; relative: number }[] {
  const vals = scores.filter((s) => VALUE_IDS.includes(s.scaleId));
  const avg = vals.reduce((a, s) => a + s.pomp, 0) / (vals.length || 1);
  return vals
    .map((s) => ({
      id: s.scaleId,
      label: valueLabel.get(s.scaleId) ?? s.scaleId,
      pomp: s.pomp,
      relative: Math.round((s.pomp - avg) * 10) / 10,
    }))
    .sort((a, b) => b.relative - a.relative);
}

export function riasecCodeOf(scores: ScaleScore[]): string {
  return riasecCode(Object.fromEntries(scores.map((s) => [s.scaleId, s.pomp])));
}

/** 結果の一覧などに出す、ひとことの見出し（例: 「やさしい夢想家」「興味のコード SIA」） */
export function resultHeadline(r: AssessmentResult): string {
  const family = scaleFamily(r.instrumentId);
  if (family === 'bigfive') return growTypeOf(r.scores).name;
  if (r.instrumentId.startsWith('riasec')) {
    const code = riasecCodeOf(r.scores);
    return `興味のコード ${code}（${[...code].map((c) => riasecLabel.get(c)).join('・')}）`;
  }
  if (r.instrumentId.startsWith('values')) {
    return `大切にしたいこと：${rankedValues(r.scores)
      .slice(0, 3)
      .map((v) => v.label)
      .join('・')}`;
  }
  return '';
}

/** キャラクターのひとことに入れる、短い呼び名（例: 「やさしい夢想家」「SIA」「思いやり・自律・安全」） */
export function resultShortName(r: AssessmentResult): string {
  if (r.instrumentId.startsWith('riasec')) return riasecCodeOf(r.scores);
  if (r.instrumentId.startsWith('values'))
    return rankedValues(r.scores)
      .slice(0, 3)
      .map((v) => v.label)
      .join('・');
  return resultHeadline(r);
}
