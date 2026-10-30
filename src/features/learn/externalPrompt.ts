import { BIG_FIVE_FULL } from '@/features/assess/instruments/bigfive';
import { LEARN_PACK_FORMAT, TOPIC_CATEGORIES } from './types';
import { BUILTIN_TOPICS } from './content/topics';

/**
 * 外部の AI（ChatGPT・Claude・Gemini など）に、考え方カードを作ってもらうためのプロンプト。
 * 返ってきた JSON を「取り込む」に貼り付けると、検証してから保存する。
 */
export function learnPackPrompt(theme: string, count: number): string {
  const example = BUILTIN_TOPICS[0];
  const domains = BIG_FIVE_FULL.scales
    .filter((s) => !s.parent)
    .map((s) => `${s.id}=${s.label}`)
    .join('、');
  return [
    'あなたは、社会で生きていくための考え方を分かりやすく教える教材作家です。',
    `テーマ「${theme.trim() || '職場の人間関係'}」について、自己成長アプリ「Grow」で使う「考え方カード」を ${count} 個作ってください。`,
    '',
    '## 出力の形式',
    '次の形の JSON だけを出力してください（説明文は不要）。',
    '```json',
    JSON.stringify(
      {
        format: LEARN_PACK_FORMAT,
        version: 1,
        topics: [
          {
            ...example,
            body: '（本文。Markdown。見出しは使わず、箇条書き・太字は可。300〜700 字程度）',
          },
        ],
      },
      null,
      2,
    ),
    '```',
    '',
    '## ルール',
    '- id: 英小文字・数字・ハイフンで、ほかと重ならないもの（例: "small-talk-basics"）',
    `- category: ${Object.entries(TOPIC_CATEGORIES)
      .map(([k, v]) => `"${k}"（${v}）`)
      .join('・')} のどれか`,
    '- keyPoints: 要点を 2〜4 個',
    '- practice: 今日から試せる、小さく具体的な行動を 1 つ',
    '- quiz: 理解を確かめる選択問題を 1〜3 問。answer は正解の選択肢の番号（0 から数える）。正解の位置は偏らせない',
    `- recommendFor: このカードが特に役立ちそうな性格の傾向（任意）。${domains} の記号に + （高め）か - （低め）を付ける（例: ["A+", "N+"]）`,
    '- 説教くさくせず、具体的な場面の例を入れる。医学的な診断や治療の話はしない',
  ].join('\n');
}
