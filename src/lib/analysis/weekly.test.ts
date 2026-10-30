import { describe, expect, it } from 'vitest';
import type { Checkin } from '@/features/checkin/types';
import { reportMarkdown } from '@/features/reflect/weeklyData';
import { weekStartOf, weeklyReport } from './weekly';

const at = (date: string, h = 20) =>
  new Date(`${date}T${String(h).padStart(2, '0')}:00:00`).getTime();
const c = (date: string, mood: number, stress: number, tags: string[] = []): Checkin => ({
  id: date + mood,
  date,
  createdAt: at(date),
  mood,
  energy: mood,
  stress,
  tags,
});
const empty = { logs: [], progress: [], results: [], topicTitles: {}, instrumentTitles: {} };

describe('週のレポート', () => {
  it('週は月曜はじまり', () => {
    expect(new Date(weekStartOf(at('2026-10-29'))).getDay()).toBe(1); // 木 → 月曜
    expect(weekStartOf(at('2026-11-01'))).toBe(weekStartOf(at('2026-10-26'))); // 日曜は同じ週
  });

  it('今週の平均・先週との差・良かった日・ハイライトを出す', () => {
    const checkins = [
      c('2026-10-20', 2, 4),
      c('2026-10-21', 2, 4),
      c('2026-10-26', 4, 2, ['運動']),
      c('2026-10-27', 5, 1, ['運動']),
      c('2026-10-28', 3, 3, ['運動', '寝不足']),
    ];
    const r = weeklyReport(weekStartOf(at('2026-10-27')), {
      ...empty,
      checkins,
      logs: [
        {
          id: 'l',
          kind: 'roleplay',
          createdAt: at('2026-10-27'),
          data: { scenarioId: 's', steps: [], score: 3, maxScore: 4 },
        },
      ],
      progress: [{ topicId: 't', reviews: [{ at: at('2026-10-28'), correct: 1, total: 2 }] }],
      topicTitles: { t: '傾聴' },
    });
    expect(r.start).toBe('2026-10-26');
    expect(r.end).toBe('2026-11-01');
    expect(r.condition).toMatchObject({ days: 3, mood: 4, stress: 2 });
    expect(r.change.mood).toBe(2);
    expect(r.change.stress).toBe(-2);
    expect(r.days[1].mood).toBe(5);
    expect(r.days[6].mood).toBeNull();
    expect(r.bestDay?.date).toBe('2026-10-27');
    expect(r.hardDay?.date).toBe('2026-10-28');
    expect(r.tags[0]).toEqual({ tag: '運動', count: 3 });
    expect(r.roleplayAverage).toBe(75);
    expect(r.learning).toEqual({ quizzes: 1, accuracy: 50, topics: ['傾聴'] });
    expect(r.highlights.some((h) => h.includes('気分の平均が先週より 2 上がりました'))).toBe(true);
    expect(r.empty).toBe(false);
    const md = reportMarkdown(r, [{ name: 'ハル', text: 'おつかれ！' }]);
    expect(md).toContain('2026-10-26 〜 2026-11-01');
    expect(md).toContain('**ハル**: おつかれ！');
  });

  it('記録のない週は empty', () => {
    const r = weeklyReport(weekStartOf(at('2026-10-27')), {
      ...empty,
      checkins: [c('2026-10-01', 3, 3)],
    });
    expect(r.empty).toBe(true);
    expect(r.bestDay).toBeNull();
  });
});
