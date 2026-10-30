/**
 * 日々のチェックイン・練習・学びの記録の分析（純粋な関数。Worker で動く）。
 */
import type { Checkin } from '@/features/checkin/types';
import type { PracticeLog } from '@/features/practice/types';
import type { TopicProgress } from '@/features/learn/types';

const day = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round1 = (x: number | null) => (x === null ? null : Math.round(x * 10) / 10);

export interface DailyCondition {
  date: string;
  mood: number;
  energy: number;
  stress: number;
  sleep: number | null;
  count: number;
}

export interface TagStat {
  tag: string;
  count: number;
  mood: number;
  energy: number;
  stress: number;
  /** その日がタグ付きのとき、気分が全体の平均よりどれだけ高いか（低いとマイナス） */
  moodDiff: number;
}

export interface ConditionSummary {
  daily: DailyCondition[];
  /** 月〜日の平均（記録がない曜日は null） */
  weekday: {
    label: string;
    mood: number | null;
    energy: number | null;
    stress: number | null;
    count: number;
  }[];
  tags: TagStat[];
  overall: {
    mood: number | null;
    energy: number | null;
    stress: number | null;
    sleep: number | null;
    days: number;
  };
}

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'];

/** チェックインの集計（同じ日に何度か記録したら、その日の平均にする） */
export function conditionSummary(checkins: Checkin[]): ConditionSummary {
  const byDate = new Map<string, Checkin[]>();
  for (const c of checkins) byDate.set(c.date, [...(byDate.get(c.date) ?? []), c]);
  const daily = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => {
      const sleeps = list.flatMap((c) => (c.sleep !== undefined ? [c.sleep] : []));
      return {
        date,
        mood: round1(mean(list.map((c) => c.mood)))!,
        energy: round1(mean(list.map((c) => c.energy)))!,
        stress: round1(mean(list.map((c) => c.stress)))!,
        sleep: round1(mean(sleeps)),
        count: list.length,
      };
    });

  const weekday = WEEKDAYS.map((label, i) => {
    const days = daily.filter((d) => (new Date(`${d.date}T12:00:00`).getDay() + 6) % 7 === i);
    return {
      label,
      mood: round1(mean(days.map((d) => d.mood))),
      energy: round1(mean(days.map((d) => d.energy))),
      stress: round1(mean(days.map((d) => d.stress))),
      count: days.length,
    };
  });

  const overallMood = mean(checkins.map((c) => c.mood));
  const tagMap = new Map<string, Checkin[]>();
  for (const c of checkins) for (const t of c.tags) tagMap.set(t, [...(tagMap.get(t) ?? []), c]);
  const tags = [...tagMap.entries()]
    .map(([tag, list]) => ({
      tag,
      count: list.length,
      mood: round1(mean(list.map((c) => c.mood)))!,
      energy: round1(mean(list.map((c) => c.energy)))!,
      stress: round1(mean(list.map((c) => c.stress)))!,
      moodDiff: round1(mean(list.map((c) => c.mood))! - (overallMood ?? 0))!,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    daily,
    weekday,
    tags,
    overall: {
      mood: round1(overallMood),
      energy: round1(mean(checkins.map((c) => c.energy))),
      stress: round1(mean(checkins.map((c) => c.stress))),
      sleep: round1(mean(checkins.flatMap((c) => (c.sleep !== undefined ? [c.sleep] : [])))),
      days: daily.length,
    },
  };
}

/** 日ごとに並べる変数（相関を見る） */
export const DAILY_VARIABLES = {
  mood: '気分',
  energy: 'エネルギー',
  stress: 'ストレス',
  sleep: '睡眠',
  practice: '練習の回数',
  learning: 'クイズの回数',
} as const;

export type DailyVariable = keyof typeof DAILY_VARIABLES;

export type DailyRow = { date: string } & Partial<Record<DailyVariable, number>>;

/**
 * 日ごとの表を作る。チェックインした日だけを行にし、練習・クイズはその日の回数（なければ 0）。
 */
export function dailyTable(
  checkins: Checkin[],
  logs: PracticeLog[],
  progress: TopicProgress[],
): DailyRow[] {
  const cond = conditionSummary(checkins).daily;
  const practice = new Map<string, number>();
  for (const l of logs) practice.set(day(l.createdAt), (practice.get(day(l.createdAt)) ?? 0) + 1);
  const learning = new Map<string, number>();
  for (const p of progress)
    for (const r of p.reviews) learning.set(day(r.at), (learning.get(day(r.at)) ?? 0) + 1);
  return cond.map((c) => ({
    date: c.date,
    mood: c.mood,
    energy: c.energy,
    stress: c.stress,
    ...(c.sleep !== null && { sleep: c.sleep }),
    practice: practice.get(c.date) ?? 0,
    learning: learning.get(c.date) ?? 0,
  }));
}

/** ピアソンの相関係数（値がそろっている組が 3 つ未満、またはばらつきがなければ null） */
export function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3 || n !== ys.length) return null;
  const mx = mean(xs)!;
  const my = mean(ys)!;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  if (sxx === 0 || syy === 0) return null;
  return Math.round((sxy / Math.sqrt(sxx * syy)) * 100) / 100;
}

export interface CorrelationCell {
  x: DailyVariable;
  y: DailyVariable;
  r: number | null;
  n: number;
}

/** 変数どうしの相関の表（同じ日に両方の値があるものだけで計算） */
export function correlationMatrix(rows: DailyRow[]): CorrelationCell[] {
  const vars = Object.keys(DAILY_VARIABLES) as DailyVariable[];
  const cells: CorrelationCell[] = [];
  for (const x of vars) {
    for (const y of vars) {
      const pairs = rows.filter((r) => r[x] !== undefined && r[y] !== undefined);
      cells.push({
        x,
        y,
        r:
          x === y
            ? 1
            : pearson(
                pairs.map((r) => r[x]!),
                pairs.map((r) => r[y]!),
              ),
        n: pairs.length,
      });
    }
  }
  return cells;
}

/** 相関の強さの言い方（目安） */
export function correlationLabel(r: number | null): string {
  if (r === null) return 'データ不足';
  const a = Math.abs(r);
  const dir = r > 0 ? '正' : '負';
  if (a >= 0.7) return `強い${dir}の相関`;
  if (a >= 0.4) return `${dir}の相関`;
  if (a >= 0.2) return `弱い${dir}の相関`;
  return 'ほとんど相関なし';
}

export interface LearningCategoryStat {
  category: string;
  topics: number;
  learned: number;
  quizzes: number;
  correct: number;
  total: number;
  /** 正答率（%）。クイズをしていなければ null */
  accuracy: number | null;
}

/** 分野ごとの学びの記録（topics はトピックの id・分野・題名だけ渡す） */
export function learningByCategory(
  topics: { id: string; category: string }[],
  progress: TopicProgress[],
): LearningCategoryStat[] {
  const byId = new Map(progress.map((p) => [p.topicId, p]));
  const cats = new Map<string, LearningCategoryStat>();
  for (const t of topics) {
    const c = cats.get(t.category) ?? {
      category: t.category,
      topics: 0,
      learned: 0,
      quizzes: 0,
      correct: 0,
      total: 0,
      accuracy: null,
    };
    const p = byId.get(t.id);
    c.topics++;
    if (p?.reviews.length) c.learned++;
    for (const r of p?.reviews ?? []) {
      c.quizzes++;
      c.correct += r.correct;
      c.total += r.total;
    }
    c.accuracy = c.total ? Math.round((c.correct / c.total) * 100) : null;
    cats.set(t.category, c);
  }
  return [...cats.values()];
}
