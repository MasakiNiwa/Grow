/** アプリの表示名 */
export const APP_TITLE = 'Grow';
/** ひとことの説明（ロゴの下・ヘルプなど） */
export const APP_TAGLINE = '人間改善プログラム';

/** GitHub リポジトリ（ヘルプページのみで使用。ヘッダーには置かない方針） */
export const REPOSITORY_URL = 'https://github.com/MasakiNiwa/Grow';

/** 共通モデル保存領域のメタデータに記録するアプリ名（LLLM-Study の docs/SHARED_MODEL_STORAGE.md） */
export const APP_NAME = 'Grow';

/** localStorage のキーや IndexedDB の DB 名に付ける接頭辞（同じ github.io のほかのサイトとぶつけない） */
export const STORAGE_PREFIX = 'grow';

export const LITERTLM_URL = 'https://github.com/google-ai-edge/LiteRT-LM';
export const LITERTLM_DOCS_URL = 'https://ai.google.dev/edge/litert-lm';
/** 同じ github.io でモデルを共有しているサイト */
export const SHARED_MODEL_SITES = [
  { name: 'LLLM Study', url: 'https://masakiniwa.github.io/LLLM-Study/' },
  { name: 'Try Local', url: 'https://masakiniwa.github.io/Try-Local/' },
];
