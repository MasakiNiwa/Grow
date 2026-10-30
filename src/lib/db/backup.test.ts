import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { clearAllData, exportBackup, parseBackup, restoreBackup } from './backup';

const sample = {
  id: 'r1',
  instrumentId: 'bigfive-60',
  instrumentVersion: 1,
  createdAt: 1,
  durationMs: 1000,
  answers: { 'e1-1': 4 },
  scores: [{ scaleId: 'E', mean: 4, pomp: 75, answered: 1, total: 12 }],
};

describe('バックアップ', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('書き出したものを読み込んで、同じデータに戻せる', async () => {
    await db.results.add(sample);
    const backup = await exportBackup({ theme: 'dark' });
    await clearAllData();
    const parsed = parseBackup(JSON.stringify(backup));
    await restoreBackup(parsed);
    expect(await db.results.toArray()).toEqual([sample]);
    expect(parsed.settings.theme).toBe('dark');
  });

  it('形式が違うものは読み込まず、今のデータに触れない', async () => {
    await db.results.add(sample);
    expect(() => parseBackup('{')).toThrow();
    expect(() => parseBackup(JSON.stringify({ format: 'other' }))).toThrow();
    expect(() =>
      parseBackup(
        JSON.stringify({
          format: 'grow-backup',
          version: 1,
          exportedAt: 1,
          data: { results: [{ id: 1 }] },
        }),
      ),
    ).toThrow();
    expect(await db.results.count()).toBe(1);
  });
});
