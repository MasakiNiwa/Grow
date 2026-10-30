import { db } from '@/lib/db/db';
import { createId } from '@/lib/utils/id';
import { SCENARIOS } from './content/scenarios';
import type { PracticeLog, Scenario } from './types';

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

/** 練習の記録を保存する */
export async function saveLog<L extends PracticeLog>(
  log: Omit<L, 'id' | 'createdAt'>,
): Promise<string> {
  const id = createId();
  await db.logs.add({ ...log, id, createdAt: Date.now() } as PracticeLog);
  return id;
}

export async function deleteLog(id: string): Promise<void> {
  await db.logs.delete(id);
}

/** シナリオの最高点（どの道を通っても最大で取れる点数の合計） */
export function maxScore(s: Scenario, nodeId = s.start, seen = new Set<string>()): number {
  const node = s.nodes[nodeId];
  if (!node || node.end || seen.has(nodeId)) return 0;
  const nextSeen = new Set(seen).add(nodeId);
  return Math.max(...node.choices.map((c) => c.score + maxScore(s, c.next, nextSeen)));
}
