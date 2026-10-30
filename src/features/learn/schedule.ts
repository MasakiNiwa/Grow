/**
 * 復習のタイミング（FSRS）。「いつ復習するか」は AI ではなくこのアルゴリズムが決める。
 * クイズの正答率から評価（もう一度・難しい・正解）を決めて、次の復習日を出す。
 */
import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from 'ts-fsrs';
import type { FsrsState } from './types';

const scheduler = fsrs(generatorParameters({ request_retention: 0.9, enable_fuzz: true }));

function toCard(s: FsrsState): Card {
  return {
    ...s,
    due: new Date(s.due),
    last_review: s.last_review ? new Date(s.last_review) : undefined,
  } as Card;
}

function fromCard(c: Card): FsrsState {
  return {
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review?.getTime(),
  };
}

/** 正答率から評価を決める（全問正解: Good、半分以上: Hard、それ未満: Again） */
export function gradeFromScore(correct: number, total: number): Grade {
  if (total > 0 && correct === total) return Rating.Good;
  if (correct * 2 >= total) return Rating.Hard;
  return Rating.Again;
}

export function nextSchedule(prev: FsrsState | undefined, grade: Grade, now: number): FsrsState {
  const card = prev ? toCard(prev) : createEmptyCard(new Date(now));
  return fromCard(scheduler.next(card, new Date(now), grade).card);
}
