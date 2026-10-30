/**
 * AI に渡すシステムプロンプトと会話設定。
 * キャラクター＋アプリの中での役割＋守ってほしいルールを組み立てる。
 */
import type { ConversationSettings } from '@/lib/llm/types';
import type { Settings } from '@/features/settings/settingsStore';
import { USER_AGE_LABELS, USER_GENDER_LABELS } from '@/features/settings/labels';
import { getPersona, type Persona } from './personas';

const RULES = [
  '【ルール】',
  '- 診断の採点やタイプ分けはアプリのプログラムが行います。あなたが得点を計算し直したり、タイプを決め直したりしないでください。',
  '- アプリの状態は <app_state> の JSON で渡されることがあります。数字や記録はそこ（またはツールの結果）にあるものだけを使い、作り話をしないでください。',
  '- 性格に良い・悪いはありません。決めつけず、強みの活かし方と、気をつけたいところとして話してください。',
  '- 医学的・心理学的な診断や治療はしません。つらさが続く・眠れないなど心身の不調が見えたら、身近な人や専門の窓口への相談をやさしく勧めてください。',
  '- 分からないこと・自信がないことは正直にそう伝えてください。',
  '- 日本語で、スマホで読みやすいよう短め（3〜6 文程度）に答えてください。必要なら箇条書きを使います。',
];

export function buildSystemPrompt(
  s: Settings,
  options: { tools: boolean; persona?: Persona },
): string {
  const persona = options.persona ?? getPersona(s.persona, s);
  const lines = [
    'あなたは「Grow」（人間改善プログラム）というアプリの中にいるキャラクターです。Grow は、性格や適性を知り、社会で生きていくための考え方を学び、練習して、ふりかえるアプリです。',
    `【キャラクター】${persona.style}`,
    '【役割】ユーザーの成長に寄り添い、リアクションしたり、分かることは解説したり、一緒に悩んだり、質問を掘り下げたりします。答えを押し付けず、ユーザー自身が気づけるよう問いかけも使います。',
    ...RULES,
  ];
  if (options.tools) {
    lines.push(
      '- 診断の結果や記録が必要なときは、用意されたツールを使って調べてから答えてください。',
    );
  }
  const about = userProfileText(s);
  if (about) {
    lines.push(
      `【ユーザーについて】${about}。話題や例の選び方・言葉づかいの参考にしてください（性別・年齢による固定観念に基づく発言はしないでください）。`,
    );
  }
  if (s.extraInstructions.trim()) {
    lines.push('【ユーザーからの追加の指示】', s.extraInstructions.trim());
  }
  return lines.join('\n');
}

/** 2 人目のキャラクターとして、相棒の発言に一言添えるときのシステムプロンプト */
export function buildSecondVoicePrompt(s: Settings, second: Persona, main: Persona): string {
  return [
    buildSystemPrompt(s, { tools: false, persona: second }),
    `【この場面での役目】あなたは 2 人目のキャラクターです。直前に「${main.name}」がユーザーに答えました。${main.name}とは違う「${second.viewpoint}」から、1〜2 文だけ短く添えてください。${main.name}の言ったことを繰り返したり、否定したりはしません。名前の見出しは付けず、発言だけを書きます。`,
  ].join('\n');
}

/** ユーザーの性別・年齢層（設定したものだけ。何も設定していなければ空） */
export function userProfileText(s: Pick<Settings, 'userGender' | 'userAge'>): string {
  return [
    s.userGender && `性別: ${USER_GENDER_LABELS[s.userGender]}`,
    s.userAge && `年齢層: ${USER_AGE_LABELS[s.userAge]}`,
  ]
    .filter(Boolean)
    .join('、');
}

export function getConversationSettings(
  s: Settings,
  options: { tools: boolean },
): ConversationSettings {
  return {
    systemPrompt: buildSystemPrompt(s, options),
    temperature: s.temperature,
    topK: s.topK,
    topP: s.topP,
    maxOutputTokens: s.maxOutputTokens,
    enableThinking: s.enableThinking,
  };
}
