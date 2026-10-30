import { describe, expect, it } from 'vitest';
import type { Checkin } from '@/features/checkin/types';
import { streakDays } from '@/features/checkin/checkinData';
import { toCsv } from '@/features/reflect/csv';
import {
  conditionSummary,
  correlationLabel,
  correlationMatrix,
  dailyTable,
  learningByCategory,
  pearson,
} from './condition';

const at = (date: string, h = 20) =>
  new Date(`${date}T${String(h).padStart(2, '0')}:00:00`).getTime();
const c = (date: string, mood: number, extra: Partial<Checkin> = {}): Checkin => ({
  id: `${date}-${mood}-${Math.random()}`,
  date,
  createdAt: at(date),
  mood,
  energy: mood,
  stress: 6 - mood,
  tags: [],
  ...extra,
});

describe('コンディションの集計', () => {
  it('同じ日は平均し、曜日・タグごとにまとめる', () => {
    const s = conditionSummary([
      c('2026-10-26', 2, { tags: ['寝不足'] }),
      c('2026-10-26', 4),
      c('2026-10-27', 5, { tags: ['運動'], sleep: 8 }),
    ]);
    expect(s.daily).toHaveLength(2);
    expect(s.daily[0]).toMatchObject({ date: '2026-10-26', mood: 3, count: 2, sleep: null });
    expect(s.weekday[0]).toMatchObject({ label: '月', mood: 3, count: 1 });
    expect(s.weekday[1]).toMatchObject({ label: '火', mood: 5 });
    const exercise = s.tags.find((t) => t.tag === '運動')!;
    expect(exercise.moodDiff).toBeGreaterThan(0);
    expect(s.tags.find((t) => t.tag === '寝不足')!.moodDiff).toBeLessThan(0);
    expect(s.overall.sleep).toBe(8);
  });
});

describe('相関', () => {
  it('ピアソンの相関係数', () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBe(1);
    expect(pearson([1, 2, 3], [3, 2, 1])).toBe(-1);
    expect(pearson([1, 2], [1, 2])).toBeNull();
    expect(pearson([1, 1, 1], [1, 2, 3])).toBeNull();
    expect(correlationLabel(0.8)).toBe('強い正の相関');
    expect(correlationLabel(-0.45)).toBe('負の相関');
    expect(correlationLabel(0.1)).toBe('ほとんど相関なし');
  });

  it('日ごとの表に練習とクイズの回数を足し、相関の表を作る', () => {
    const checkins = [
      c('2026-10-01', 2, { sleep: 5 }),
      c('2026-10-02', 3, { sleep: 6 }),
      c('2026-10-03', 4, { sleep: 7 }),
      c('2026-10-04', 5, { sleep: 8 }),
    ];
    const rows = dailyTable(
      checkins,
      [
        {
          id: 'l',
          kind: 'if-then',
          createdAt: at('2026-10-04', 9),
          data: { trigger: 'a', action: 'b' },
        },
      ],
      [{ topicId: 't', reviews: [{ at: at('2026-10-03', 9), correct: 1, total: 1 }] }],
    );
    expect(rows.find((r) => r.date === '2026-10-04')?.practice).toBe(1);
    expect(rows.find((r) => r.date === '2026-10-03')?.learning).toBe(1);
    const cells = correlationMatrix(rows);
    expect(cells.find((x) => x.x === 'sleep' && x.y === 'mood')).toMatchObject({ r: 1, n: 4 });
    expect(cells.find((x) => x.x === 'mood' && x.y === 'stress')!.r).toBe(-1);
  });
});

describe('学びの記録', () => {
  it('分野ごとに学んだ数と正答率を出す', () => {
    const stats = learningByCategory(
      [
        { id: 'a', category: 'thinking' },
        { id: 'b', category: 'thinking' },
        { id: 'c', category: 'work' },
      ],
      [
        {
          topicId: 'a',
          reviews: [
            { at: 1, correct: 1, total: 2 },
            { at: 2, correct: 2, total: 2 },
          ],
        },
      ],
    );
    expect(stats.find((s) => s.category === 'thinking')).toMatchObject({
      topics: 2,
      learned: 1,
      accuracy: 75,
    });
    expect(stats.find((s) => s.category === 'work')!.accuracy).toBeNull();
  });
});

describe('チェックインの連続日数・CSV', () => {
  it('今日まだなら、昨日までで数える', () => {
    expect(streakDays(['2026-10-28', '2026-10-29', '2026-10-30'], '2026-10-30')).toBe(3);
    expect(streakDays(['2026-10-28', '2026-10-29'], '2026-10-30')).toBe(2);
    expect(streakDays(['2026-10-27'], '2026-10-30')).toBe(0);
  });

  it('CSV は BOM 付きで、カンマ・引用符を含む値を囲む', () => {
    expect(toCsv(['a', 'b'], [['x,y', 'say "hi"']])).toBe('﻿a,b\r\n"x,y","say ""hi"""\r\n');
  });
});
