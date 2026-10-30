import type { BackendKind } from '@/lib/llm/types';
import type { BackendSetting, ReactionMode, UserAge, UserGender } from './settingsStore';

export const BACKEND_LABELS: Record<BackendKind, string> = {
  'gpu-artisan': 'GPU（Artisan）',
  gpu: 'GPU',
  cpu: 'CPU',
};

export const BACKEND_SETTING_LABELS: Record<BackendSetting, string> = {
  auto: '自動（推奨）',
  ...BACKEND_LABELS,
};

export const REACTION_LABELS: Record<ReactionMode, string> = {
  off: 'なし',
  template: '決まったひとこと（モデル不要）',
  llm: 'AI が考える（AI がないときは決まったひとこと）',
};

export const USER_GENDER_LABELS: Record<UserGender, string> = {
  '': '指定しない',
  female: '女性',
  male: '男性',
  other: 'その他',
};

export const USER_AGE_LABELS: Record<UserAge, string> = {
  '': '指定しない',
  teen: '10 代',
  '20s': '20 代',
  '30s': '30 代',
  '40s': '40 代',
  '50s': '50 代',
  '60plus': '60 代以上',
};
