import type { QuizQuestion } from './types';

/**
 * 選択肢の順番を混ぜる（正解の位置を毎回変える。教材側の正解の位置の偏りも気にしなくてよくなる）。
 * answer は混ぜたあとの正解の位置に付け替える。
 */
export function shuffleQuiz(q: QuizQuestion, random = Math.random): QuizQuestion {
  const order = q.choices.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { ...q, choices: order.map((i) => q.choices[i]), answer: order.indexOf(q.answer) };
}
