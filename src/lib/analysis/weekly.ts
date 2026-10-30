/**
 * 週ごとのふりかえりレポート（純粋な関数。Worker で動く）。
 * 週は月曜はじまり。数字・ハイライトはすべてプログラムが決め、AI はその上でコメントする。
 */
import type { AssessmentResult } from '@/features/assess/types';
import type { Checkin } from '@/features/checkin/types';
import type { TopicProgress } from '@/features/learn/types';
import type { PracticeKind, PracticeLog } from '@/features/practice/types';

const DAY = 86400000;

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** その日を含む週の月曜日 0 時（端末の時刻） */
export function weekStartOf(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

const avg = (xs: number[]) =>
  xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null;
const diff = (a: number | null, b: number | null) =>
  a === null || b === null ? null : Math.round((a - b) * 10) / 10;

export interface WeekCondition {
  days: number;
  mood: number | null;
  energy: number | null;
  stress: number | null;
  sleep: number | null;
}

export interface WeeklyReport {
  /** 月曜日（YYYY-MM-DD）と日曜日 */
  start: string;
  end: string;
  condition: WeekCondition;
  /** 先週との差（気分・エネルギー・ストレス・睡眠） */
  change: {
    mood: number | null;
    energy: number | null;
    stress: number | null;
    sleep: number | null;
  };
  /** 日ごとの気分（月〜日。記録がなければ null） */
  days: { date: string; mood: number | null; stress: number | null }[];
  bestDay: { date: string; mood: number; tags: string[]; note?: string } | null;
  hardDay: { date: string; mood: number; tags: string[]; note?: string } | null;
  tags: { tag: string; count: number }[];
  practice: Partial<Record<PracticeKind, number>>;
  practiceTotal: number;
  /** ロールプレイの平均得点率（%） */
  roleplayAverage: number | null;
  learning: { quizzes: number; accuracy: number | null; topics: string[] };
  assessments: string[];
  /** プログラムが選んだ、今週のハイライト（短い文） */
  highlights: string[];
  /** 何も記録がない週 */
  empty: boolean;
}

function conditionOf(list: Checkin[]): WeekCondition {
  return {
    days: new Set(list.map((c) => c.date)).size,
    mood: avg(list.map((c) => c.mood)),
    energy: avg(list.map((c) => c.energy)),
    stress: avg(list.map((c) => c.stress)),
    sleep: avg(list.flatMap((c) => (c.sleep !== undefined ? [c.sleep] : []))),
  };
}

export function weeklyReport(
  weekStart: number,
  data: {
    checkins: Checkin[];
    logs: PracticeLog[];
    progress: TopicProgress[];
    results: AssessmentResult[];
    topicTitles: Record<string, string>;
    instrumentTitles: Record<string, string>;
  },
): WeeklyReport {
  const start = weekStart;
  const end = weekStart + 7 * DAY;
  const inWeek = (ms: number) => ms >= start && ms < end;
  const inPrev = (ms: number) => ms >= start - 7 * DAY && ms < start;

  const checkins = data.checkins.filter((c) => inWeek(c.createdAt));
  const prev = data.checkins.filter((c) => inPrev(c.createdAt));
  const condition = conditionOf(checkins);
  const before = conditionOf(prev);

  const dates = Array.from({ length: 7 }, (_, i) => ymd(new Date(start + i * DAY + DAY / 2)));
  const days = dates.map((date) => {
    const list = checkins.filter((c) => c.date === date);
    return { date, mood: avg(list.map((c) => c.mood)), stress: avg(list.map((c) => c.stress)) };
  });
  const sorted = [...checkins].sort((a, b) => b.mood - a.mood || a.stress - b.stress);
  const pickDay = (c: Checkin | undefined) =>
    c ? { date: c.date, mood: c.mood, tags: c.tags, note: c.note } : null;
  const bestDay = pickDay(sorted[0]);
  const hardDay =
    sorted.length > 1 && sorted.at(-1)!.mood < sorted[0].mood ? pickDay(sorted.at(-1)) : null;

  const tagCount = new Map<string, number>();
  for (const c of checkins) for (const t of c.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  const tags = [...tagCount.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  const logs = data.logs.filter((l) => inWeek(l.createdAt));
  const practice: Partial<Record<PracticeKind, number>> = {};
  for (const l of logs) practice[l.kind] = (practice[l.kind] ?? 0) + 1;
  const ratios = logs.flatMap((l) =>
    l.kind === 'roleplay' && l.data.maxScore
      ? [(l.data.score / l.data.maxScore) * 100]
      : l.kind === 'ai-roleplay' && l.data.feedback?.score !== undefined
        ? [l.data.feedback.score]
        : [],
  );

  let quizzes = 0;
  let correct = 0;
  let total = 0;
  const topics = new Set<string>();
  for (const p of data.progress) {
    for (const r of p.reviews) {
      if (!inWeek(r.at)) continue;
      quizzes++;
      correct += r.correct;
      total += r.total;
      topics.add(data.topicTitles[p.topicId] ?? p.topicId);
    }
  }
  const assessments = data.results
    .filter((r) => inWeek(r.createdAt))
    .map((r) => data.instrumentTitles[r.instrumentId] ?? r.instrumentId);

  const change = {
    mood: diff(condition.mood, before.mood),
    energy: diff(condition.energy, before.energy),
    stress: diff(condition.stress, before.stress),
    sleep: diff(condition.sleep, before.sleep),
  };

  const highlights: string[] = [];
  if (condition.days >= 5)
    highlights.push(`${condition.days} 日チェックインできました。続ける力がついています`);
  else if (condition.days > 0) highlights.push(`${condition.days} 日チェックインしました`);
  if (change.mood !== null && change.mood >= 0.5)
    highlights.push(`気分の平均が先週より ${change.mood} 上がりました`);
  if (change.mood !== null && change.mood <= -0.5)
    highlights.push(
      `気分の平均が先週より ${Math.abs(change.mood)} 下がりました。無理をしていないか、ひと息つきましょう`,
    );
  if (change.stress !== null && change.stress <= -0.5)
    highlights.push(`ストレスが先週より ${Math.abs(change.stress)} 軽くなりました`);
  if (change.stress !== null && change.stress >= 0.5)
    highlights.push(`ストレスが先週より ${change.stress} 強めでした`);
  const practiceTotal = logs.length;
  if (practiceTotal > 0) highlights.push(`練習を ${practiceTotal} 回しました`);
  if (quizzes > 0)
    highlights.push(
      `考え方カードのクイズに ${quizzes} 回挑戦しました（正答率 ${Math.round((correct / total) * 100)}%）`,
    );
  if (assessments.length) highlights.push(`診断を受けました：${assessments.join('・')}`);
  if (tags[0] && tags[0].count >= 3)
    highlights.push(`よくあったできごと：${tags[0].tag}（${tags[0].count} 回）`);

  return {
    start: dates[0],
    end: dates[6],
    condition,
    change,
    days,
    bestDay,
    hardDay,
    tags: tags.slice(0, 6),
    practice,
    practiceTotal,
    roleplayAverage: ratios.length
      ? Math.round(ratios.reduce((a, b) => a + b, 0) / ratios.length)
      : null,
    learning: {
      quizzes,
      accuracy: total ? Math.round((correct / total) * 100) : null,
      topics: [...topics],
    },
    assessments,
    highlights,
    empty: checkins.length === 0 && logs.length === 0 && quizzes === 0 && assessments.length === 0,
  };
}
