import { describe, expect, it } from 'vitest';
import { BIG_FIVE_FULL, BIG_FIVE_QUICK } from './instruments/bigfive';
import { growTypeOf } from './instruments/bigfiveTypes';
import { itemsOfScale, keyedValue, levelOf, scoreAnswers, scoreMap } from './scoring';
import { INSTRUMENTS } from './registry';

describe('ビッグファイブの設問', () => {
  it('じっくり版は 30 の側面に 4 問ずつ、クイック版は 2 問ずつ', () => {
    expect(BIG_FIVE_FULL.items).toHaveLength(120);
    expect(BIG_FIVE_QUICK.items).toHaveLength(60);
    for (const facet of BIG_FIVE_FULL.scales.filter((s) => s.parent)) {
      expect(BIG_FIVE_FULL.items.filter((i) => i.scale === facet.id)).toHaveLength(4);
      const quick = BIG_FIVE_QUICK.items.filter((i) => i.scale === facet.id);
      expect(quick).toHaveLength(2);
      // クイック版は順方向と逆転を 1 問ずつ
      expect(quick.map((i) => i.keyed).sort()).toEqual([-1, 1]);
    }
  });

  it('設問の id・文は重複しない', () => {
    for (const inst of INSTRUMENTS) {
      expect(new Set(inst.items.map((i) => i.id)).size).toBe(inst.items.length);
      expect(new Set(inst.items.map((i) => i.text)).size).toBe(inst.items.length);
      expect(new Set(inst.scales.map((s) => s.id)).size).toBe(inst.scales.length);
    }
  });
});

describe('採点', () => {
  it('逆転項目を戻す', () => {
    expect(keyedValue(BIG_FIVE_FULL, 1, 5)).toBe(5);
    expect(keyedValue(BIG_FIVE_FULL, -1, 5)).toBe(1);
    expect(keyedValue(BIG_FIVE_FULL, -1, 2)).toBe(4);
  });

  it('領域の設問には、下の側面の設問がすべて入る', () => {
    expect(itemsOfScale(BIG_FIVE_FULL, 'E')).toHaveLength(24);
    expect(itemsOfScale(BIG_FIVE_FULL, 'E1')).toHaveLength(4);
  });

  it('すべて「当てはまる」方向に答えると 100、反対なら 0', () => {
    const high = Object.fromEntries(BIG_FIVE_FULL.items.map((i) => [i.id, i.keyed === 1 ? 5 : 1]));
    const low = Object.fromEntries(BIG_FIVE_FULL.items.map((i) => [i.id, i.keyed === 1 ? 1 : 5]));
    expect(scoreAnswers(BIG_FIVE_FULL, high).every((s) => s.pomp === 100)).toBe(true);
    expect(scoreAnswers(BIG_FIVE_FULL, low).every((s) => s.pomp === 0)).toBe(true);
  });

  it('すべて「どちらともいえない」なら 50。未回答は中央の値で、answered は 0', () => {
    const mid = Object.fromEntries(BIG_FIVE_FULL.items.map((i) => [i.id, 3]));
    expect(scoreAnswers(BIG_FIVE_FULL, mid).every((s) => s.pomp === 50)).toBe(true);
    const none = scoreMap(scoreAnswers(BIG_FIVE_FULL, {}));
    expect(none.E.pomp).toBe(50);
    expect(none.E.answered).toBe(0);
    expect(none.E.total).toBe(24);
  });

  it('水準', () => {
    expect(levelOf(39.9)).toBe('low');
    expect(levelOf(40)).toBe('mid');
    expect(levelOf(60)).toBe('mid');
    expect(levelOf(60.1)).toBe('high');
  });
});

describe('Grow タイプ', () => {
  const scores = (p: Record<string, number>) =>
    Object.entries(p).map(([scaleId, pomp]) => ({ scaleId, pomp, mean: 0, answered: 1, total: 1 }));

  it('E・O・A・C の高低と、情緒の敏感さで決まる', () => {
    const t = growTypeOf(scores({ E: 80, O: 70, A: 60, C: 90, N: 20 }));
    expect(t.code).toBe('E+O+A+C+');
    expect(t.name).toBe('道をひらく案内人');
    expect(t.stable).toBe(true);
    const u = growTypeOf(scores({ E: 10, O: 20, A: 30, C: 40, N: 70 }));
    expect(u.code).toBe('E-O-A-C-');
    expect(u.stable).toBe(false);
  });
});
