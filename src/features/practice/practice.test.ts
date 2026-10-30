import { describe, expect, it } from 'vitest';
import { practiceSummary } from '@/lib/analysis/analysis';
import { BUILTIN_TOPICS } from '@/features/learn/content/topics';
import { SCENARIOS } from './content/scenarios';
import { parseFeedback } from './aiRoleplay';
import { maxScore } from './practiceData';
import type { PracticeLog } from './types';

describe('場面ロールプレイ', () => {
  it('すべての選択肢の行き先があり、どの道もいずれ終わりに着く', () => {
    for (const s of SCENARIOS) {
      expect(s.nodes[s.start], s.id).toBeDefined();
      const visit = (id: string, depth: number) => {
        expect(depth, `${s.id}: 深すぎる（ループ？）`).toBeLessThan(10);
        const node = s.nodes[id];
        expect(node, `${s.id}: ${id} がない`).toBeDefined();
        if (node.end) return;
        expect(node.choices.length).toBeGreaterThan(1);
        for (const c of node.choices) visit(c.next, depth + 1);
      };
      visit(s.start, 0);
    }
  });

  it('どの場面にも満点の道があり、関係するカードは実在する', () => {
    const ids = new Set(BUILTIN_TOPICS.map((t) => t.id));
    for (const s of SCENARIOS) {
      expect(maxScore(s)).toBeGreaterThanOrEqual(4);
      for (const t of s.topicIds) expect(ids.has(t), `${s.id}: ${t}`).toBe(true);
    }
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(SCENARIOS.length);
  });
});

describe('AI のふりかえり', () => {
  it('前後に文章があっても JSON を取り出し、形を確かめる', () => {
    const text =
      'はい！\n```json\n{"good":["結論から話せた"],"improve":[],"phrase":"〜","score":80}\n```';
    expect(parseFeedback(text)).toEqual({
      good: ['結論から話せた'],
      improve: [],
      phrase: '〜',
      score: 80,
    });
    expect(parseFeedback('{"good":[]}')).toBeNull();
    expect(parseFeedback('JSON なし')).toBeNull();
  });
});

describe('練習の記録の集計', () => {
  it('週ごとの回数・得点率・気持ちの変化・考え方のくせを数える', () => {
    const mon = new Date(2026, 9, 26, 12).getTime();
    const logs: PracticeLog[] = [
      {
        id: 'a',
        kind: 'roleplay',
        createdAt: mon,
        data: { scenarioId: 'x', steps: [], score: 3, maxScore: 4 },
      },
      {
        id: 'b',
        kind: 'reframe',
        createdAt: mon + 86400000,
        data: {
          event: '',
          thought: '',
          feeling: '',
          before: 80,
          distortions: ['白黒思考'],
          alternative: '',
          after: 40,
        },
      },
      {
        id: 'c',
        kind: 'reframe',
        createdAt: mon + 7 * 86400000,
        data: {
          event: '',
          thought: '',
          feeling: '',
          before: 60,
          distortions: ['白黒思考', 'すべき思考'],
          alternative: '',
          after: 40,
        },
      },
    ];
    const s = practiceSummary(logs);
    expect(s.weekly).toHaveLength(2);
    expect(s.weekly[0].counts).toEqual({ roleplay: 1, reframe: 1 });
    expect(s.roleplay[0].ratio).toBe(75);
    expect(s.reframe).toEqual({ count: 2, averageDrop: 30 });
    expect(s.distortions[0]).toEqual({ name: '白黒思考', count: 2 });
  });
});
