import { z } from 'zod';

/**
 * 学ぶ: 考え方カード（トピック）の形。組み込みのものも、外部の AI で作って取り込むものも同じ形。
 */
export const TOPIC_CATEGORIES = {
  communication: 'コミュニケーション',
  thinking: '考え方',
  emotion: '気持ちの整え方',
  relationship: '人間関係',
  work: '仕事・生活',
} as const;

export type TopicCategory = keyof typeof TOPIC_CATEGORIES;

export const quizSchema = z.object({
  question: z.string().min(1),
  choices: z.array(z.string().min(1)).min(2).max(5),
  answer: z.number().int().min(0),
  explanation: z.string().optional(),
});

export const topicSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{2,60}$/),
    category: z.enum(Object.keys(TOPIC_CATEGORIES) as [TopicCategory, ...TopicCategory[]]),
    title: z.string().min(1).max(80),
    summary: z.string().min(1).max(200),
    body: z.string().min(1).max(6000),
    keyPoints: z.array(z.string().min(1)).min(1).max(6),
    practice: z.string().min(1).max(300),
    quiz: z.array(quizSchema).min(1).max(6),
    /** 診断の傾向とのつながり（例: "A+" は協調性が高め、"N-" は情緒の敏感さが低め） */
    recommendFor: z.array(z.string().regex(/^[EACNO][+-]$/)).optional(),
  })
  .refine((t) => t.quiz.every((q) => q.answer < q.choices.length), {
    message: 'クイズの answer が選択肢の範囲外です',
  });

export type QuizQuestion = z.infer<typeof quizSchema>;
export type Topic = z.infer<typeof topicSchema>;

/** 取り込んだトピック（端末に保存） */
export interface CustomTopic extends Topic {
  importedAt: number;
}

export const LEARN_PACK_FORMAT = 'grow-learn-pack';

export const learnPackSchema = z.object({
  format: z.literal(LEARN_PACK_FORMAT),
  version: z.literal(1),
  topics: z.array(topicSchema).min(1).max(30),
});

/** FSRS のカード（日時はミリ秒で保存） */
export interface FsrsState {
  due: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review?: number;
}

/** トピックごとの進み具合 */
export interface TopicProgress {
  topicId: string;
  readAt?: number;
  /** 次の復習日（FSRS が決める）。インデックス用に fsrs.due と同じ値 */
  due?: number;
  fsrs?: FsrsState;
  /** クイズの記録 */
  reviews: { at: number; correct: number; total: number }[];
  /** 「やってみた」の回数 */
  practiced?: number;
}
