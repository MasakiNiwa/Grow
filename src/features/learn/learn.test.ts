import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';
import { db } from '@/lib/db/db';
import { BUILTIN_TOPICS } from './content/topics';
import { learnPackPrompt } from './externalPrompt';
import { importTopics, markRead, parseLearnPack, recordQuiz } from './learnData';
import { gradeFromScore, nextSchedule } from './schedule';
import { shuffleQuiz } from './shuffleQuiz';
import { allTopics, recommendTopics } from './topics';
import { LEARN_PACK_FORMAT, topicSchema } from './types';

const scores = (p: Record<string, number>) =>
  Object.entries(p).map(([scaleId, pomp]) => ({ scaleId, pomp, mean: 0, answered: 1, total: 1 }));

describe('組み込みのトピック', () => {
  it('すべて形式に合い、id は重複しない', () => {
    for (const t of BUILTIN_TOPICS) expect(topicSchema.safeParse(t).success, t.id).toBe(true);
    expect(new Set(BUILTIN_TOPICS.map((t) => t.id)).size).toBe(BUILTIN_TOPICS.length);
  });

  it('選択肢を混ぜても、正解の選択肢は変わらない', () => {
    for (const t of BUILTIN_TOPICS) {
      for (const q of t.quiz) {
        let seed = 0.37;
        const shuffled = shuffleQuiz(q, () => (seed = (seed * 9301 + 0.49297) % 1));
        expect(shuffled.choices[shuffled.answer]).toBe(q.choices[q.answer]);
        expect([...shuffled.choices].sort()).toEqual([...q.choices].sort());
      }
    }
  });
});

describe('おすすめ', () => {
  it('高め（>60）・低め（<40）の特性に合うトピックを、未読を優先して選ぶ', () => {
    const recs = recommendTopics(
      BUILTIN_TOPICS,
      scores({ E: 50, A: 80, C: 50, N: 50, O: 50 }),
      new Set(['assertion']),
      10,
    );
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.every((r) => r.reasons.includes('協調性が高め'))).toBe(true);
    expect(recs.at(-1)!.topic.id).toBe('assertion');
  });

  it('中くらいだけなら、おすすめはない', () => {
    expect(recommendTopics(BUILTIN_TOPICS, scores({ E: 50, A: 50 }), new Set())).toEqual([]);
  });
});

describe('復習のタイミング', () => {
  it('正答率から評価を決める', () => {
    expect(gradeFromScore(2, 2)).toBe(Rating.Good);
    expect(gradeFromScore(1, 2)).toBe(Rating.Hard);
    expect(gradeFromScore(0, 3)).toBe(Rating.Again);
  });

  it('正解するほど次の復習は先になる', () => {
    const now = Date.UTC(2026, 0, 1);
    const good = nextSchedule(undefined, Rating.Good, now);
    const again = nextSchedule(undefined, Rating.Again, now);
    expect(good.due).toBeGreaterThan(again.due);
    const later = nextSchedule(good, Rating.Good, good.due);
    expect(later.due - good.due).toBeGreaterThan(good.due - now);
  });
});

describe('記録と取り込み', () => {
  beforeEach(async () => {
    await Promise.all([db.progress.clear(), db.topics.clear()]);
  });

  it('読んだ・クイズの結果を記録し、復習日を付ける', async () => {
    await markRead('assertion');
    const p = await recordQuiz('assertion', 2, 2);
    expect(p.readAt).toBeDefined();
    expect(p.due).toBeGreaterThan(Date.now());
    expect(p.reviews).toHaveLength(1);
  });

  const pack = (topics: unknown[]) =>
    JSON.stringify({ format: LEARN_PACK_FORMAT, version: 1, topics });
  const sample = { ...BUILTIN_TOPICS[0], id: 'my-topic' };

  it('外部の AI の JSON を検証して取り込む（コードブロックで囲まれていてもよい）', async () => {
    const topics = parseLearnPack('```json\n' + pack([sample]) + '\n```');
    await importTopics(topics);
    expect((await allTopics()).some((t) => t.id === 'my-topic')).toBe(true);
  });

  it('形式違い・組み込みと同じ id・正解の番号が範囲外のものは取り込まない', () => {
    expect(() => parseLearnPack('not json')).toThrow();
    expect(() => parseLearnPack(pack([BUILTIN_TOPICS[0]]))).toThrow(/組み込み/);
    expect(() =>
      parseLearnPack(
        pack([{ ...sample, quiz: [{ question: 'q', choices: ['a', 'b'], answer: 5 }] }]),
      ),
    ).toThrow();
  });

  it('プロンプトにテーマと形式が入る', () => {
    const text = learnPackPrompt('雑談', 3);
    expect(text).toContain('雑談');
    expect(text).toContain(LEARN_PACK_FORMAT);
  });
});
