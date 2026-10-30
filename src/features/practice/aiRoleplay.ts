/**
 * AI とロールプレイ: AI が場面の相手役を演じ、終わったら構造化されたふりかえり（JSON）を返す。
 * ふりかえりの形は zod で確かめ、読めなければ作り直す。
 */
import { z } from 'zod';
import { runOneshot, runOneshotParsed } from '@/features/ai/oneshot';
import { buildSystemPrompt } from '@/features/ai/prompt';
import { useSettings } from '@/features/settings/settingsStore';
import type { ChatTurn } from '@/lib/llm/types';
import { createId } from '@/lib/utils/id';
import type { RoleplayFeedback, Scenario } from './types';

type Turn = { role: 'user' | 'partner'; text: string };

export function partnerSystemPrompt(s: Scenario): string {
  return [
    'これは、人間関係のコミュニケーションを練習するアプリ「Grow」のロールプレイです。',
    `【あなたの役】${s.partner.name}（${s.partner.role}）`,
    `【場面と演じ方】${s.aiSetting}`,
    '【ルール】',
    '- 役になりきって、相手役のセリフだけを話し言葉で 1〜3 文で返してください。説明・ト書き・名前の見出しは書かないでください。',
    '- ユーザーの伝え方に合わせて、現実的に反応してください（良い伝え方には前向きに、きつい言い方には少しむっとするなど）。',
    '- ユーザーを傷つけるような強い言葉や、ハラスメントになる言動はしないでください。',
  ].join('\n');
}

function toHistory(turns: Turn[]): ChatTurn[] {
  return turns.map((t) => ({
    id: createId(),
    role: t.role === 'user' ? 'user' : 'assistant',
    text: t.text,
  }));
}

/** 相手役の次のセリフ（最初のセリフは、ユーザーの発言なしで始める） */
export async function partnerReply(
  s: Scenario,
  turns: Turn[],
  onText: (t: string) => void,
): Promise<{ text: string; cancelled: boolean }> {
  const last = turns.at(-1);
  const history = last?.role === 'user' ? turns.slice(0, -1) : turns;
  return runOneshot({
    task: 'roleplay',
    systemPrompt: partnerSystemPrompt(s),
    history: toHistory(history),
    prompt:
      last?.role === 'user'
        ? last.text
        : '（場面が始まります。あなたから最初のセリフを言ってください）',
    maxOutputTokens: 200,
    onText,
  });
}

export const feedbackSchema = z.object({
  good: z.array(z.string()).min(1).max(4),
  improve: z.array(z.string()).max(4),
  phrase: z.string().optional(),
  score: z.number().min(0).max(100).optional(),
});

/** AI の出力から JSON を取り出して、ふりかえりの形か確かめる */
export function parseFeedback(text: string): RoleplayFeedback | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = feedbackSchema.safeParse(JSON.parse(match[0]));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** 会話全体のふりかえり（キャラクターの口調で、決まった JSON の形） */
export async function roleplayFeedback(
  s: Scenario,
  turns: Turn[],
): Promise<{ value: RoleplayFeedback | null; cancelled: boolean }> {
  const settings = useSettings.getState();
  const transcript = turns
    .map((t) => `${t.role === 'user' ? 'ユーザー' : s.partner.name}: ${t.text}`)
    .join('\n');
  return runOneshotParsed(
    {
      task: 'assist',
      systemPrompt: buildSystemPrompt(settings, { tools: false }),
      purpose: 'structured',
      maxOutputTokens: 600,
      prompt: [
        `ユーザーが「${s.title}」（${s.summary}）の場面をロールプレイで練習しました。`,
        '```',
        transcript,
        '```',
        'ユーザーの伝え方をふりかえってください。相手も自分も大切にする伝え方（アサーション・傾聴など）の観点で、',
        '次の JSON だけを出力してください（あなたのキャラクターの口調で書いてよい）:',
        '{"good": ["良かった点（1〜3 個）"], "improve": ["次に試すとよいこと（0〜3 個）"], "phrase": "もっと良くなる言い換えの例（1 文）", "score": 0〜100 の目安}',
      ].join('\n'),
    },
    parseFeedback,
  );
}
