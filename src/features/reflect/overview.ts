/**
 * 分析のまとめ（AI へのコメント依頼・外部の AI 用のプロンプト・AI のツールで共通に使う）。
 * 数字はすべてアプリが計算し、AI には解釈だけを頼む。
 */
import { db } from '@/lib/db/db';
import { analysis } from '@/lib/analysis/client';
import { DAILY_VARIABLES, correlationLabel } from '@/lib/analysis/condition';
import { summarizeBigFive } from '@/features/ai/appContext';
import { scaleFamily } from '@/features/assess/registry';
import { allTopics } from '@/features/learn/topics';
import { TOPIC_CATEGORIES, type TopicCategory } from '@/features/learn/types';
import { getScenario } from '@/features/practice/practiceData';
import { PRACTICE_KIND_LABELS, type PracticeKind } from '@/features/practice/types';

export async function buildAnalysisOverview() {
  const [results, checkins, logs, progress, topics] = await Promise.all([
    db.results.orderBy('createdAt').toArray(),
    db.checkins.toArray(),
    db.logs.toArray(),
    db.progress.toArray(),
    allTopics(),
  ]);
  const bigFive = results.filter((r) => scaleFamily(r.instrumentId) === 'bigfive');
  const [condition, table, practice, learning] = await Promise.all([
    analysis().conditionSummary(checkins),
    analysis().dailyTable(checkins, logs, progress),
    analysis().practiceSummary(logs),
    analysis().learningByCategory(
      topics.map((t) => ({ id: t.id, category: t.category })),
      progress,
    ),
  ]);
  const cells = await analysis().correlationMatrix(table);
  const vars = Object.keys(DAILY_VARIABLES);
  const notable = cells
    .filter(
      (c) =>
        vars.indexOf(c.x) < vars.indexOf(c.y) && c.r !== null && Math.abs(c.r) >= 0.3 && c.n >= 5,
    )
    .sort((a, b) => Math.abs(b.r!) - Math.abs(a.r!))
    .slice(0, 5)
    .map((c) => ({
      pair: `${DAILY_VARIABLES[c.x]}×${DAILY_VARIABLES[c.y]}`,
      r: c.r,
      days: c.n,
      meaning: correlationLabel(c.r),
    }));

  const recentDays = condition.daily.slice(-14);
  return {
    generatedAt: new Date().toISOString().slice(0, 10),
    personality: bigFive.length
      ? {
          latest: summarizeBigFive(bigFive.at(-1)!),
          assessments: bigFive.length,
        }
      : null,
    condition: checkins.length
      ? {
          days: condition.overall.days,
          average: condition.overall,
          last14days: recentDays.map((d) => ({
            date: d.date,
            mood: d.mood,
            energy: d.energy,
            stress: d.stress,
            sleep: d.sleep,
          })),
          weekday: condition.weekday.filter((w) => w.count > 0),
          tags: condition.tags
            .slice(0, 8)
            .map((t) => ({ tag: t.tag, count: t.count, moodDiff: t.moodDiff, stress: t.stress })),
        }
      : null,
    correlations: notable,
    learning: learning
      .filter((l) => l.quizzes > 0)
      .map((l) => ({
        category: TOPIC_CATEGORIES[l.category as TopicCategory] ?? l.category,
        learned: `${l.learned}/${l.topics}`,
        accuracy: l.accuracy,
      })),
    practice: logs.length
      ? {
          total: logs.length,
          byKind: Object.fromEntries(
            (Object.keys(PRACTICE_KIND_LABELS) as PracticeKind[])
              .map((k) => [PRACTICE_KIND_LABELS[k], logs.filter((l) => l.kind === k).length])
              .filter(([, n]) => n),
          ),
          roleplay: practice.roleplay.slice(-5).map((r) => ({
            scene: getScenario(r.scenarioId)?.title,
            score: r.ratio,
          })),
          reframe: practice.reframe,
          distortions: practice.distortions.slice(0, 3),
        }
      : null,
  };
}

export type AnalysisOverview = Awaited<ReturnType<typeof buildAnalysisOverview>>;

/** 外部の AI 用のプロンプト */
export function overviewPrompt(o: AnalysisOverview): string {
  return [
    'あなたは、データをやさしく読み解くコーチです。以下は、自己成長アプリ「Grow」に記録された私のデータをアプリが集計したものです。',
    '（personality の得点は 0〜100 で 50 が中間。condition の気分・エネルギーは 5 が良い、ストレスは 5 が強い。correlations は日ごとの相関係数 r）',
    '',
    '```json',
    JSON.stringify(o, null, 2),
    '```',
    '',
    '次の順に、日本語で、具体的に分析してください。',
    '1. データから読み取れる、私の調子の傾向（3〜5 点）',
    '2. 調子が良い日・悪い日に共通していそうなこと（相関は因果ではないことに注意して）',
    '3. 性格の傾向とあわせて考えたときの、強みの活かし方',
    '4. 来週試せる、小さな実験を 3 つ（何を・いつ・どう測るか）',
    '',
    '注意: 決めつけず、医学的な診断はしないでください。データが少ないところは「まだ分からない」と書いてください。',
  ].join('\n');
}
