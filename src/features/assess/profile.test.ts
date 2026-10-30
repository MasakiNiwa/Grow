import { describe, expect, it } from 'vitest';
import { summarizeResult } from '@/features/ai/appContext';
import { BIG_FIVE_QUICK } from './instruments/bigfive';
import { RIASEC, riasecCode } from './instruments/riasec';
import { VALUES, VALUE_IDS } from './instruments/values';
import { rankedValues, resultHeadline, riasecCodeOf } from './headline';
import { profileLinks } from './profileLinks';
import { scoreAnswers } from './scoring';
import type { AssessmentResult, Instrument } from './types';

/** 尺度ごとに「当てはまる度合い」を決めて答える（逆転項目は逆に答える） */
function result(inst: Instrument, answer: (scale: string) => number): AssessmentResult {
  const answers = Object.fromEntries(
    inst.items.map((i) => [i.id, i.keyed === 1 ? answer(i.scale) : 6 - answer(i.scale)]),
  );
  return {
    id: inst.id,
    instrumentId: inst.id,
    instrumentVersion: 1,
    createdAt: 1,
    durationMs: 1,
    answers,
    scores: scoreAnswers(inst, answers),
  };
}

describe('興味（RIASEC）と価値観の設問', () => {
  it('RIASEC は 6 タイプ × 8 問、価値観は 10 の価値 × 3 問で、4 つのまとまりの下にある', () => {
    expect(RIASEC.items).toHaveLength(48);
    for (const t of ['R', 'I', 'A', 'S', 'E', 'C'])
      expect(RIASEC.items.filter((i) => i.scale === t)).toHaveLength(8);
    expect(VALUES.items).toHaveLength(30);
    expect(VALUE_IDS).toHaveLength(10);
    expect(VALUES.scales.filter((s) => !s.parent)).toHaveLength(4);
    for (const v of VALUE_IDS) expect(VALUES.scales.find((s) => s.id === v)?.parent).toBeDefined();
  });

  it('興味のコードは得点の高い上位 3 つ（同点は RIASEC の順）', () => {
    expect(riasecCode({ R: 10, I: 90, A: 80, S: 95, E: 20, C: 30 })).toBe('SIA');
    expect(riasecCode({ R: 50, I: 50, A: 50, S: 50, E: 50, C: 50 })).toBe('RIA');
    const r = result(RIASEC, (s) => (s === 'E' ? 5 : s === 'C' ? 4 : 2));
    expect(riasecCodeOf(r.scores).slice(0, 2)).toBe('EC');
    expect(resultHeadline(r)).toContain('興味のコード EC');
  });

  it('価値観は、その人の平均との差で順位を付ける', () => {
    const r = result(VALUES, (s) => (s === 'BE' ? 5 : s === 'PO' ? 1 : 4));
    const ranked = rankedValues(r.scores);
    expect(ranked).toHaveLength(10);
    expect(ranked[0].id).toBe('BE');
    expect(ranked.at(-1)!.id).toBe('PO');
    expect(ranked[0].relative).toBeGreaterThan(0);
    expect(resultHeadline(r)).toMatch(/^大切にしたいこと：思いやり/);
  });
});

describe('総合プロフィールのつながり', () => {
  const big = (p: Record<string, number>) => result(BIG_FIVE_QUICK, (facet) => p[facet[0]] ?? 3);

  it('外向性が低く、人と関わる興味が高いと「葛藤」を見つける', () => {
    const links = profileLinks(
      big({ E: 1 }),
      result(RIASEC, (s) => (s === 'S' ? 5 : 2)),
    );
    expect(links.some((l) => l.kind === 'tension' && l.title.includes('充電'))).toBe(true);
  });

  it('開放性が高く、自律・刺激を大切にすると「後押し」を見つける', () => {
    const links = profileLinks(
      big({ O: 5 }),
      undefined,
      result(VALUES, (s) => (s === 'SD' || s === 'ST' ? 5 : 3)),
    );
    expect(links.some((l) => l.kind === 'match' && l.title.includes('自由'))).toBe(true);
  });

  it('結果がなければ、つながりは出さない', () => {
    expect(profileLinks()).toEqual([]);
  });

  it('AI 向けの要約は、診断ごとに形を変える', () => {
    expect(summarizeResult(result(RIASEC, () => 3))).toMatchObject({ kind: '興味（RIASEC）' });
    expect(summarizeResult(result(VALUES, () => 3))).toMatchObject({ kind: '価値観' });
    expect(summarizeResult(big({}))).toMatchObject({ kind: '性格（ビッグファイブ）' });
  });
});
