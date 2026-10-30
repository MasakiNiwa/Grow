/** 練習: 場面ロールプレイ（分岐シナリオ）と、改善トレーニング（ワークシート）の型 */

export interface ScenarioChoice {
  text: string;
  next: string;
  /** 2 = 相手も自分も大切にした伝え方、1 = 惜しい、0 = 攻撃的・受け身すぎ */
  score: 0 | 1 | 2;
  feedback: string;
}

export type ScenarioNode =
  | { line: string; choices: ScenarioChoice[]; end?: undefined }
  | { line: string; end: true; choices?: undefined };

export interface Scenario {
  id: string;
  title: string;
  summary: string;
  /** 関係する考え方カード */
  topicIds: string[];
  partner: { name: string; role: string; emoji: string };
  /** AI で自由に練習するとき、AI に演じてもらう役と場面 */
  aiSetting: string;
  start: string;
  nodes: Record<string, ScenarioNode>;
}

/** 練習の記録の種類 */
export type PracticeKind = 'roleplay' | 'ai-roleplay' | 'reframe' | 'good-things' | 'if-then';

export interface RoleplayData {
  scenarioId: string;
  /** 選んだ選択肢（場面の id と選択肢の番号） */
  steps: { node: string; choice: number; score: number }[];
  score: number;
  maxScore: number;
}

export interface AiRoleplayData {
  scenarioId: string;
  turns: { role: 'user' | 'partner'; text: string }[];
  feedback?: RoleplayFeedback;
}

export interface RoleplayFeedback {
  good: string[];
  improve: string[];
  /** 言い換えの例 */
  phrase?: string;
  /** 0〜100（AI の評価。目安） */
  score?: number;
}

export interface ReframeData {
  event: string;
  thought: string;
  /** 気持ちの名前と強さ（0〜100） */
  feeling: string;
  before: number;
  distortions: string[];
  alternative: string;
  after: number;
}

export interface GoodThingsData {
  items: string[];
}

export interface IfThenData {
  trigger: string;
  action: string;
}

export type PracticeLog =
  | { id: string; kind: 'roleplay'; createdAt: number; data: RoleplayData }
  | { id: string; kind: 'ai-roleplay'; createdAt: number; data: AiRoleplayData }
  | { id: string; kind: 'reframe'; createdAt: number; data: ReframeData }
  | { id: string; kind: 'good-things'; createdAt: number; data: GoodThingsData }
  | { id: string; kind: 'if-then'; createdAt: number; data: IfThenData };

export const PRACTICE_KIND_LABELS: Record<PracticeKind, string> = {
  roleplay: '場面ロールプレイ',
  'ai-roleplay': 'AI とロールプレイ',
  reframe: '考え方の整理',
  'good-things': '3 つのよいこと',
  'if-then': '小さな習慣プラン',
};
