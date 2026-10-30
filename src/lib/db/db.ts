import Dexie, { type EntityTable } from 'dexie';
import { STORAGE_PREFIX } from '@/lib/constants';
import type { AssessmentDraft, AssessmentResult } from '@/features/assess/types';

/**
 * アプリのデータ（端末内の IndexedDB）。
 * テーブルを足すときは version を上げて stores に追加し、BACKUP_TABLES（backup.ts）にも加える。
 */
export class GrowDB extends Dexie {
  results!: EntityTable<AssessmentResult, 'id'>;
  drafts!: EntityTable<AssessmentDraft, 'instrumentId'>;

  constructor(name = `${STORAGE_PREFIX}`) {
    super(name);
    this.version(1).stores({
      results: 'id, instrumentId, createdAt',
      drafts: 'instrumentId, updatedAt',
    });
  }
}

export const db = new GrowDB();
