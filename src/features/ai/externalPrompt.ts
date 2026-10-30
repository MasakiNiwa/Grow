import type { AssessmentResult } from '@/features/assess/types';
import { summarizeBigFive } from './appContext';

/**
 * アプリの AI では足りないとき、外部の高性能な AI（ChatGPT・Claude・Gemini など）に貼り付けて使うプロンプト。
 * 結果はアプリが計算した数字を JSON で渡し、外部の AI には解釈だけを頼む。
 */
export function bigFiveDeepDivePrompt(result: AssessmentResult): string {
  const summary = summarizeBigFive(result);
  return [
    'あなたは性格心理学（ビッグファイブ）に詳しい、やさしいキャリア・人間関係のアドバイザーです。',
    '以下は、自己理解アプリ「Grow」で受けたビッグファイブ診断の結果です。得点は 0〜100（50 が中間。人と比べた順位ではなく、回答の平均を 0〜100 に直したもの）です。',
    '',
    '```json',
    JSON.stringify(summary, null, 2),
    '```',
    '',
    '次の順に、日本語で、具体的な場面の例を交えて説明してください。',
    '1. 全体の傾向（3〜4 文）',
    '2. 強みと、それが活きる場面（仕事・人間関係・学び）',
    '3. つまずきやすい場面と、その乗り越え方（小さく試せる行動）',
    '4. 今後 2 週間で試せる、具体的な練習を 3 つ',
    '',
    '注意: 決めつけず、良い・悪いではなく活かし方として書いてください。医学的な診断はしないでください。',
  ].join('\n');
}
