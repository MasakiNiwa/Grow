import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_PREFIX } from '@/lib/constants';

export type ThemeSetting = 'system' | 'light' | 'dark';
/** ダークモードの配色。neutral: 色味のないグレー、warm: 暖かいグレー */
export type DarkPalette = 'neutral' | 'warm';

/** 診断の 1 ページに出す設問の数 */
export type ItemsPerPage = 1 | 5 | 10;

export interface Settings {
  // ---- 表示 ----
  theme: ThemeSetting;
  darkPalette: DarkPalette;
  /** 文字を少し大きくする */
  largeText: boolean;
  /** 動きを減らす（アニメーションを控える） */
  reduceMotion: boolean;
  // ---- 診断 ----
  itemsPerPage: ItemsPerPage;
  /** 答えたら自動で次の設問へ進む（1 問ずつのとき） */
  autoAdvance: boolean;
  // ---- バックアップ ----
  /** 最後にデータを書き出した日時 */
  lastBackupAt: number | null;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  darkPalette: 'neutral',
  largeText: false,
  reduceMotion: false,
  itemsPerPage: 5,
  autoAdvance: true,
  lastBackupAt: null,
};

interface SettingsState extends Settings {
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch),
      reset: () => set((s) => ({ ...DEFAULT_SETTINGS, lastBackupAt: s.lastBackupAt })),
    }),
    {
      name: `${STORAGE_PREFIX}:settings`,
      version: 1,
      partialize: ({ update: _u, reset: _r, ...rest }) => rest,
    },
  ),
);

/** 端末ごとに決める設定（バックアップに含めない） */
const DEVICE_ONLY: (keyof Settings)[] = ['lastBackupAt'];

/** バックアップに含める設定 */
export function portableSettings(s: Settings): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    if (!DEVICE_ONLY.includes(key)) out[key] = s[key];
  }
  return out;
}

/** バックアップの設定から、使えるものだけを取り出す（知らない項目・型の違う値・端末ごとの設定は無視） */
export function sanitizeSettings(raw: Record<string, unknown>): Partial<Settings> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    if (DEVICE_ONLY.includes(key) || !(key in raw)) continue;
    const value = raw[key];
    const def = DEFAULT_SETTINGS[key];
    const ok =
      def === null
        ? value === null || typeof value === 'number'
        : typeof value === typeof def && (typeof def !== 'object' || value !== null);
    if (ok) out[key] = value;
  }
  return out as Partial<Settings>;
}
