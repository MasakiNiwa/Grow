import { z } from 'zod';
import { db } from './db';
import { topicSchema } from '@/features/learn/types';
import type { PracticeLog } from '@/features/practice/types';

/**
 * データのバックアップ（JSON に書き出し・読み込み）。
 * 読み込みは、全件を検証してから置き換える（失敗したら今のデータに触れない）。
 * テーブルを増やしたら BACKUP_TABLES と schema に足す。
 */
export const BACKUP_FORMAT = 'grow-backup';
export const BACKUP_VERSION = 1;

const scaleScore = z.object({
  scaleId: z.string(),
  mean: z.number(),
  pomp: z.number(),
  answered: z.number(),
  total: z.number(),
});

const result = z.object({
  id: z.string(),
  instrumentId: z.string(),
  instrumentVersion: z.number(),
  createdAt: z.number(),
  durationMs: z.number(),
  answers: z.record(z.string(), z.number()),
  scores: z.array(scaleScore),
  note: z.string().optional(),
});

const draft = z.object({
  instrumentId: z.string(),
  instrumentVersion: z.number(),
  answers: z.record(z.string(), z.number()),
  order: z.array(z.string()),
  startedAt: z.number(),
  updatedAt: z.number(),
});

const chat = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  text: z.string(),
  createdAt: z.number(),
  context: z.string().optional(),
  speaker: z.string().optional(),
  aside: z.boolean().optional(),
  thinking: z.string().optional(),
  tools: z.array(z.string()).optional(),
  error: z.string().optional(),
});

const fsrsState = z.object({
  due: z.number(),
  stability: z.number(),
  difficulty: z.number(),
  elapsed_days: z.number(),
  scheduled_days: z.number(),
  learning_steps: z.number(),
  reps: z.number(),
  lapses: z.number(),
  state: z.number(),
  last_review: z.number().optional(),
});

const progress = z.object({
  topicId: z.string(),
  readAt: z.number().optional(),
  due: z.number().optional(),
  fsrs: fsrsState.optional(),
  reviews: z.array(z.object({ at: z.number(), correct: z.number(), total: z.number() })),
  practiced: z.number().optional(),
});

/** 練習の記録（中身は種類ごとに違うので、種類と日時だけ確かめる） */
const log = z.object({
  id: z.string(),
  kind: z.enum(['roleplay', 'ai-roleplay', 'reframe', 'good-things', 'if-then']),
  createdAt: z.number(),
  data: z.record(z.string(), z.unknown()),
});

const customTopic = topicSchema.and(z.object({ importedAt: z.number() }));

export const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.number().int().max(BACKUP_VERSION),
  exportedAt: z.number(),
  settings: z.record(z.string(), z.unknown()).default({}),
  data: z.object({
    results: z.array(result).default([]),
    drafts: z.array(draft).default([]),
    chat: z.array(chat).default([]),
    topics: z.array(customTopic).default([]),
    progress: z.array(progress).default([]),
    logs: z.array(log).default([]),
  }),
});

export type Backup = z.infer<typeof backupSchema>;

export async function exportBackup(settings: Record<string, unknown>): Promise<Backup> {
  const [results, drafts, chatRecords, topics, progressRecords, logs] = await Promise.all([
    db.results.toArray(),
    db.drafts.toArray(),
    db.chat.toArray(),
    db.topics.toArray(),
    db.progress.toArray(),
    db.logs.toArray(),
  ]);
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    settings,
    data: {
      results,
      drafts,
      chat: chatRecords,
      topics,
      progress: progressRecords,
      logs: logs as unknown as Backup['data']['logs'],
    },
  };
}

/** バックアップの JSON を検証する（エラーなら例外） */
export function parseBackup(text: string): Backup {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('JSON として読めませんでした');
  }
  const parsed = backupSchema.safeParse(json);
  if (!parsed.success) throw new Error('Grow のバックアップの形式ではありません');
  return parsed.data;
}

const TABLES = () => [db.results, db.drafts, db.chat, db.topics, db.progress, db.logs];

/** バックアップで今のデータを置き換える（1 つのトランザクション） */
export async function restoreBackup(backup: Backup): Promise<void> {
  await db.transaction('rw', TABLES(), async () => {
    await Promise.all(TABLES().map((t) => t.clear()));
    await db.results.bulkAdd(backup.data.results);
    await db.drafts.bulkAdd(backup.data.drafts);
    await db.chat.bulkAdd(backup.data.chat);
    await db.topics.bulkAdd(backup.data.topics);
    await db.progress.bulkAdd(backup.data.progress);
    await db.logs.bulkAdd(backup.data.logs as unknown as PracticeLog[]);
  });
}

/** すべてのデータを消す */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', TABLES(), async () => {
    await Promise.all(TABLES().map((t) => t.clear()));
  });
}
