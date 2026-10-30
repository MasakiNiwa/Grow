import Dexie, { type EntityTable } from 'dexie';
import { STORAGE_PREFIX } from '@/lib/constants';
import type { AssessmentDraft, AssessmentResult } from '@/features/assess/types';
import type { ChatRecord } from '@/features/chat/types';
import type { CustomTopic, TopicProgress } from '@/features/learn/types';
import type { PracticeLog } from '@/features/practice/types';
import type { Checkin } from '@/features/checkin/types';

/**
 * アプリのデータ（端末内の IndexedDB）。
 * テーブルを足すときは version を上げて stores に追加し、BACKUP_TABLES（backup.ts）にも加える。
 */
export class GrowDB extends Dexie {
  results!: EntityTable<AssessmentResult, 'id'>;
  drafts!: EntityTable<AssessmentDraft, 'instrumentId'>;
  chat!: EntityTable<ChatRecord, 'id'>;
  topics!: EntityTable<CustomTopic, 'id'>;
  progress!: EntityTable<TopicProgress, 'topicId'>;
  logs!: EntityTable<PracticeLog, 'id'>;
  checkins!: EntityTable<Checkin, 'id'>;

  constructor(name = `${STORAGE_PREFIX}`) {
    super(name);
    this.version(1).stores({
      results: 'id, instrumentId, createdAt',
      drafts: 'instrumentId, updatedAt',
    });
    // v2: AI とのチャット
    this.version(2).stores({ chat: 'id, createdAt' });
    // v3: 学ぶ（取り込んだトピック・進み具合）
    this.version(3).stores({ topics: 'id, importedAt', progress: 'topicId, due' });
    // v4: 練習の記録（ロールプレイ・ワークシート）
    this.version(4).stores({ logs: 'id, kind, createdAt' });
    // v5: 日々のチェックイン
    this.version(5).stores({ checkins: 'id, date, createdAt' });
  }
}

export const db = new GrowDB();
