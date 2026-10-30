import Dexie, { type EntityTable } from 'dexie';
import { STORAGE_PREFIX } from '@/lib/constants';
import type { AssessmentDraft, AssessmentResult } from '@/features/assess/types';
import type { ChatRecord } from '@/features/chat/types';

/**
 * アプリのデータ（端末内の IndexedDB）。
 * テーブルを足すときは version を上げて stores に追加し、BACKUP_TABLES（backup.ts）にも加える。
 */
export class GrowDB extends Dexie {
  results!: EntityTable<AssessmentResult, 'id'>;
  drafts!: EntityTable<AssessmentDraft, 'instrumentId'>;
  chat!: EntityTable<ChatRecord, 'id'>;

  constructor(name = `${STORAGE_PREFIX}`) {
    super(name);
    this.version(1).stores({
      results: 'id, instrumentId, createdAt',
      drafts: 'instrumentId, updatedAt',
    });
    // v2: AI とのチャット
    this.version(2).stores({ chat: 'id, createdAt' });
  }
}

export const db = new GrowDB();
