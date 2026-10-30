import { db } from '@/lib/db/db';
import { BUILTIN_TOPICS } from './content/topics';
import { gradeFromScore, nextSchedule } from './schedule';
import { learnPackSchema, type Topic, type TopicProgress } from './types';

async function load(topicId: string): Promise<TopicProgress> {
  return (await db.progress.get(topicId)) ?? { topicId, reviews: [] };
}

export async function markRead(topicId: string): Promise<void> {
  const p = await load(topicId);
  if (p.readAt) return;
  await db.progress.put({ ...p, readAt: Date.now() });
}

/** クイズの結果を記録し、次の復習日を決める */
export async function recordQuiz(
  topicId: string,
  correct: number,
  total: number,
): Promise<TopicProgress> {
  const now = Date.now();
  const p = await load(topicId);
  const fsrs = nextSchedule(p.fsrs, gradeFromScore(correct, total), now);
  const next: TopicProgress = {
    ...p,
    readAt: p.readAt ?? now,
    fsrs,
    due: fsrs.due,
    reviews: [...p.reviews, { at: now, correct, total }],
  };
  await db.progress.put(next);
  return next;
}

export async function markPracticed(topicId: string): Promise<void> {
  const p = await load(topicId);
  await db.progress.put({ ...p, practiced: (p.practiced ?? 0) + 1 });
}

/**
 * 外部の AI が作ったトピックの JSON を読み取る（取り込む前の検証）。
 * コードブロック（```json）で囲まれていても読む。組み込みと同じ id は取り込めない
 */
export function parseLearnPack(text: string): Topic[] {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '');
  let json: unknown;
  try {
    json = JSON.parse(stripped);
  } catch {
    throw new Error('JSON として読めませんでした。返ってきた内容をそのまま貼り付けてください');
  }
  const parsed = learnPackSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(`形式が違います（${issue.path.join('.') || '全体'}: ${issue.message}）`);
  }
  const builtin = new Set(BUILTIN_TOPICS.map((t) => t.id));
  const clash = parsed.data.topics.find((t) => builtin.has(t.id));
  if (clash)
    throw new Error(`id「${clash.id}」は組み込みのトピックと同じです。別の id にしてください`);
  return parsed.data.topics;
}

export async function importTopics(topics: Topic[]): Promise<void> {
  const now = Date.now();
  await db.topics.bulkPut(topics.map((t) => ({ ...t, importedAt: now })));
}

export async function deleteCustomTopic(id: string): Promise<void> {
  await db.transaction('rw', db.topics, db.progress, async () => {
    await db.topics.delete(id);
    await db.progress.delete(id);
  });
}
