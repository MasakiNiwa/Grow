import { db } from '@/lib/db/db';
import { analysis } from '@/lib/analysis/client';
import type { WeeklyReport } from '@/lib/analysis/weekly';
import { INSTRUMENTS } from '@/features/assess/registry';
import { allTopics } from '@/features/learn/topics';
import { PRACTICE_KIND_LABELS, type PracticeKind } from '@/features/practice/types';

/** 週のレポートを作る（データを集めて、計算は Worker） */
export async function loadWeeklyReport(weekStart: number): Promise<WeeklyReport> {
  const [checkins, logs, progress, results, topics] = await Promise.all([
    db.checkins.toArray(),
    db.logs.toArray(),
    db.progress.toArray(),
    db.results.toArray(),
    allTopics(),
  ]);
  return analysis().weeklyReport(weekStart, {
    checkins,
    logs,
    progress,
    results,
    topicTitles: Object.fromEntries(topics.map((t) => [t.id, t.title])),
    instrumentTitles: Object.fromEntries(INSTRUMENTS.map((i) => [i.id, i.title])),
  });
}

const sign = (x: number | null) =>
  x === null ? '' : x > 0 ? `（先週より +${x}）` : x < 0 ? `（先週より ${x}）` : '（先週と同じ）';

/** レポートを Markdown の文章にする（メモアプリなどに貼る用） */
export function reportMarkdown(
  r: WeeklyReport,
  comments: { name: string; text: string }[] = [],
): string {
  const lines = [
    `# Grow 週のふりかえり（${r.start} 〜 ${r.end}）`,
    '',
    '## ハイライト',
    ...(r.highlights.length ? r.highlights.map((h) => `- ${h}`) : ['- 記録はありませんでした']),
    '',
    '## コンディション',
    `- チェックイン: ${r.condition.days} 日`,
    `- 気分: ${r.condition.mood ?? '-'} ${sign(r.change.mood)}`,
    `- エネルギー: ${r.condition.energy ?? '-'} ${sign(r.change.energy)}`,
    `- ストレス: ${r.condition.stress ?? '-'} ${sign(r.change.stress)}`,
    `- 睡眠: ${r.condition.sleep ?? '-'} 時間 ${sign(r.change.sleep)}`,
  ];
  if (r.bestDay)
    lines.push(
      `- いちばん良かった日: ${r.bestDay.date}${r.bestDay.tags.length ? `（${r.bestDay.tags.join('・')}）` : ''}`,
    );
  if (r.hardDay)
    lines.push(
      `- しんどかった日: ${r.hardDay.date}${r.hardDay.tags.length ? `（${r.hardDay.tags.join('・')}）` : ''}`,
    );
  lines.push('', '## 学びと練習');
  const practice = (Object.keys(r.practice) as PracticeKind[]).map(
    (k) => `${PRACTICE_KIND_LABELS[k]} ${r.practice[k]} 回`,
  );
  lines.push(`- 練習: ${practice.length ? practice.join('・') : 'なし'}`);
  lines.push(
    `- クイズ: ${r.learning.quizzes} 回${r.learning.accuracy !== null ? `（正答率 ${r.learning.accuracy}%）` : ''}`,
  );
  if (r.learning.topics.length) lines.push(`- 学んだカード: ${r.learning.topics.join('・')}`);
  if (comments.length) {
    lines.push('', '## キャラクターのコメント');
    for (const c of comments) lines.push(`**${c.name}**: ${c.text}`, '');
  }
  return lines.join('\n');
}
