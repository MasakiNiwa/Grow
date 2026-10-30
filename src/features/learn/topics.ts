import { db } from '@/lib/db/db';
import { scoreMap } from '@/features/assess/scoring';
import { BIG_FIVE_FULL } from '@/features/assess/instruments/bigfive';
import type { ScaleScore } from '@/features/assess/types';
import { BUILTIN_TOPICS } from './content/topics';
import type { Topic } from './types';

/** すべてのトピック（組み込み＋取り込み）。id が同じなら組み込みを優先 */
export async function allTopics(): Promise<Topic[]> {
  const custom = await db.topics.toArray();
  const ids = new Set(BUILTIN_TOPICS.map((t) => t.id));
  return [...BUILTIN_TOPICS, ...custom.filter((t) => !ids.has(t.id))];
}

export async function getTopic(id: string): Promise<Topic | undefined> {
  return BUILTIN_TOPICS.find((t) => t.id === id) ?? (await db.topics.get(id));
}

const domainLabel = new Map(BIG_FIVE_FULL.scales.map((s) => [s.id, s.label]));

/** 傾向のタグ（例: A+）の説明 */
export function tagLabel(tag: string): string {
  return `${domainLabel.get(tag[0]) ?? tag[0]}が${tag[1] === '+' ? '高め' : '低め'}`;
}

/**
 * 診断の結果から、おすすめのトピックを選ぶ（プログラムが決める）。
 * 60 を超える特性は "+"、40 未満は "-" のタグになり、タグが多く合うトピックほど上に来る。
 * まだ読んでいないものを優先する。
 */
export function recommendTopics(
  topics: Topic[],
  scores: ScaleScore[],
  readIds: Set<string>,
  limit = 3,
): { topic: Topic; reasons: string[] }[] {
  const map = scoreMap(scores);
  const tags = new Set<string>();
  for (const d of ['E', 'A', 'C', 'N', 'O']) {
    const p = map[d]?.pomp;
    if (p === undefined) continue;
    if (p > 60) tags.add(`${d}+`);
    if (p < 40) tags.add(`${d}-`);
  }
  return topics
    .map((topic) => ({ topic, reasons: (topic.recommendFor ?? []).filter((t) => tags.has(t)) }))
    .filter((x) => x.reasons.length > 0)
    .sort(
      (a, b) =>
        Number(readIds.has(a.topic.id)) - Number(readIds.has(b.topic.id)) ||
        b.reasons.length - a.reasons.length,
    )
    .slice(0, limit)
    .map((x) => ({ topic: x.topic, reasons: x.reasons.map(tagLabel) }));
}
