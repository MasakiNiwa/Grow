import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, portableSettings, sanitizeSettings } from './settingsStore';

describe('設定のバックアップ', () => {
  it('端末ごとの設定は含めない', () => {
    const out = portableSettings({ ...DEFAULT_SETTINGS, lastBackupAt: 5 });
    expect('lastBackupAt' in out).toBe(false);
    expect(out.theme).toBe('system');
  });

  it('型の違う値・知らない項目は無視する', () => {
    expect(
      sanitizeSettings({ theme: 'dark', largeText: 'yes', unknown: 1, lastBackupAt: 3 }),
    ).toEqual({
      theme: 'dark',
    });
  });
});
