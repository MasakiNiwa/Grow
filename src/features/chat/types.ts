/** チャットの 1 発言（IndexedDB に保存する形） */
export interface ChatRecord {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
  /** ユーザーの発言に添えたアプリの状態（<app_state>） */
  context?: string;
  /** 話したキャラクター（assistant のみ。2 人目のキャラクターの発言を見分ける） */
  speaker?: string;
  /** 2 人目のキャラクターの一言（メインの会話の履歴には入れない） */
  aside?: boolean;
  thinking?: string;
  tools?: string[];
  error?: string;
}
