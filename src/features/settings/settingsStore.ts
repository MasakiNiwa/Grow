import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_PREFIX } from '@/lib/constants';
import type { CloudProviderId } from '@/lib/cloud/keyVault';
import type { BackendKind, ConversationSettings } from '@/lib/llm/types';
import type { AiTask } from '@/features/ai/aiBusy';

export type ThemeSetting = 'system' | 'light' | 'dark';
/** ダークモードの配色。neutral: 色味のないグレー、warm: 暖かいグレー */
export type DarkPalette = 'neutral' | 'warm';

/** 診断の 1 ページに出す設問の数 */
export type ItemsPerPage = 1 | 5 | 10;

/** auto: WebGPU が使えれば GPU（Artisan）、使えなければ CPU */
export type BackendSetting = 'auto' | BackendKind;

/** AI の接続先（端末内のモデルか、クラウド AI のどれか） */
export type AiProvider = 'local' | CloudProviderId;

/** 応答の種類ごとの接続先（cloud のときはモデルも） */
export interface TaskRoute {
  provider: AiProvider;
  model?: string;
}

/** AI の応答に反映するユーザーのこと（任意。空は指定しない） */
export type UserGender = '' | 'female' | 'male' | 'other';
export type UserAge = '' | 'teen' | '20s' | '30s' | '40s' | '50s' | '60plus';

/** ひとこと。template: アプリが用意した言葉（モデル不要）、llm: AI が考える */
export type ReactionMode = 'off' | 'template' | 'llm';

export interface Settings extends Omit<ConversationSettings, 'systemPrompt'> {
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
  // ---- AI（キャラクター・ふるまい） ----
  /** メインのキャラクター（相棒） */
  persona: string;
  /** 2 人目のキャラクター（空ならいない）。チャットで別の視点から一言添える */
  secondPersona: string;
  /** 相棒の答えのあとの掛け合いの回数（1: 2 人目の一言だけ、3: 一言→相棒→2 人目、など） */
  banterTurns: number;
  /** カスタムの相棒（persona = 'custom'）の性格・名前・絵文字 */
  customPersona: string;
  customName: string;
  customEmoji: string;
  /** カスタムの 2 人目（secondPersona = 'custom2'）の性格・名前・絵文字 */
  secondCustomPersona: string;
  secondCustomName: string;
  secondCustomEmoji: string;
  userGender: UserGender;
  userAge: UserAge;
  /** ユーザーが追加する指示（システムプロンプトの末尾に付ける） */
  extraInstructions: string;
  reaction: ReactionMode;
  /** AI にアプリの状態（診断の結果の要約など）を伝える */
  shareAppState: boolean;
  /** AI にツール（記録の検索など）を使わせる */
  useTools: boolean;
  /** タスクごとに温度を変える */
  taskTemperature: boolean;
  /** 単発の生成のあとも、チャットの文脈（KV キャッシュ）を残す */
  keepChatContext: boolean;
  // ---- エンジン・接続先 ----
  backend: BackendSetting;
  maxNumTokens: number;
  aiProvider: AiProvider;
  cloudModels: Partial<Record<CloudProviderId, string>>;
  cloudConsents: Partial<Record<CloudProviderId, boolean>>;
  recentCloudModels: string[];
  openrouterFavorites: string[];
  taskModels: Partial<Record<AiTask, TaskRoute>>;
  // ---- モデル管理 ----
  saveImportedModels: boolean;
  autoLoadLastModel: boolean;
  lastModelName: string | null;
  backendHints: Record<string, BackendKind>;
  // ---- 表示 ----
  enterToSend: boolean;
  showStats: boolean;
  // ---- チェックイン ----
  /** 自分で足したできごとのタグ */
  checkinTags: string[];
  /** 睡眠時間も記録する */
  checkinSleep: boolean;
  /** 最後に開いた週のレポートの週（月曜 0 時のミリ秒）。ホームの「先週のレポート」を出すかに使う */
  weeklySeen: number;
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

  persona: 'partner',
  secondPersona: '',
  banterTurns: 1,
  customPersona: '',
  customName: '',
  customEmoji: '',
  secondCustomPersona: '',
  secondCustomName: '',
  secondCustomEmoji: '',
  userGender: '',
  userAge: '',
  extraInstructions: '',
  reaction: 'llm',
  shareAppState: true,
  useTools: true,
  taskTemperature: true,
  keepChatContext: true,

  temperature: 1.0,
  topK: 64,
  topP: 0.95,
  maxOutputTokens: 1024,
  enableThinking: false,

  backend: 'auto',
  maxNumTokens: 4096,
  aiProvider: 'local',
  cloudModels: {},
  cloudConsents: {},
  recentCloudModels: [],
  openrouterFavorites: [],
  taskModels: {},

  saveImportedModels: true,
  autoLoadLastModel: true,
  lastModelName: null,
  backendHints: {},

  enterToSend: true,
  showStats: false,

  checkinTags: [],
  checkinSleep: true,
  weeklySeen: 0,

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
      // 前回のモデル名などはリセット対象外（自動読み込みのため）
      reset: () =>
        set((s) => ({
          ...DEFAULT_SETTINGS,
          lastBackupAt: s.lastBackupAt,
          lastModelName: s.lastModelName,
          backendHints: s.backendHints,
        })),
    }),
    {
      name: `${STORAGE_PREFIX}:settings`,
      version: 1,
      partialize: ({ update: _u, reset: _r, ...rest }) => rest,
    },
  ),
);

/** 端末ごとに決める設定（バックアップに含めない） */
const DEVICE_ONLY: (keyof Settings)[] = [
  'lastBackupAt',
  'weeklySeen',
  'backend',
  // クラウド AI の接続はキーと一緒に端末ごとに決める（バックアップから戻しても勝手に接続しない）
  'aiProvider',
  'cloudModels',
  'cloudConsents',
  'recentCloudModels',
  'openrouterFavorites',
  'taskModels',
  'maxNumTokens',
  'saveImportedModels',
  'autoLoadLastModel',
  'lastModelName',
  'backendHints',
];

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
        ? value === null || typeof value === 'number' || typeof value === 'string'
        : typeof def === 'number'
          ? typeof value === 'number' && Number.isFinite(value)
          : typeof value === typeof def && (typeof def !== 'object' || value !== null);
    if (ok) out[key] = value;
  }
  return out as Partial<Settings>;
}
