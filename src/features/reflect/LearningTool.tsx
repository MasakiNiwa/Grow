import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import { EChart } from '@/components/charts/EChart';
import { useChartTheme } from '@/components/charts/useChartTheme';
import { db } from '@/lib/db/db';
import { analysis } from '@/lib/analysis/client';
import type { LearningCategoryStat } from '@/lib/analysis/condition';
import { formatShortDate } from '@/lib/utils/format';
import { allTopics } from '@/features/learn/topics';
import { TOPIC_CATEGORIES, type TopicCategory } from '@/features/learn/types';
import { EmptyState, Stat } from './EmptyState';

/** 学びの記録: 分野ごとの正答率と進み具合。棒を押すと、その分野のカードごとの記録 */
export default function LearningTool() {
  const data = useLiveQuery(
    async () => ({ topics: await allTopics(), progress: await db.progress.toArray() }),
    [],
  );
  const theme = useChartTheme();
  const [stats, setStats] = useState<LearningCategoryStat[]>([]);
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    void analysis()
      .learningByCategory(
        data.topics.map((t) => ({ id: t.id, category: t.category })),
        data.progress,
      )
      .then(setStats);
  }, [data]);

  const option = useMemo(() => {
    if (!theme || stats.length === 0) return null;
    return {
      color: [theme.series[0], theme.series[1]],
      grid: { left: 8, right: 8, top: 32, bottom: 8, containLabel: true },
      legend: { top: 0, textStyle: { color: theme.text } },
      tooltip: {
        trigger: 'axis',
        backgroundColor: theme.surface,
        borderColor: theme.grid,
        textStyle: { color: theme.text },
      },
      xAxis: {
        type: 'category',
        data: stats.map((s) => TOPIC_CATEGORIES[s.category as TopicCategory] ?? s.category),
        axisLabel: { color: theme.text, interval: 0, fontSize: 11, width: 70, overflow: 'break' },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: { color: theme.muted, formatter: '{value}%' },
        splitLine: { lineStyle: { color: theme.grid } },
      },
      series: [
        { name: '正答率', type: 'bar', barMaxWidth: 22, data: stats.map((s) => s.accuracy) },
        {
          name: '学んだ割合',
          type: 'bar',
          barMaxWidth: 22,
          data: stats.map((s) => Math.round((s.learned / s.topics) * 100)),
        },
      ],
    };
  }, [theme, stats]);

  if (!data) return null;
  const reviews = data.progress.reduce((a, p) => a + p.reviews.length, 0);
  if (reviews === 0) {
    return (
      <EmptyState icon={BookOpen} href="/learn" action="学ぶ">
        まだクイズの記録がありません。考え方カードを読んで、確認クイズに答えてみましょう。
      </EmptyState>
    );
  }
  const byId = new Map(data.progress.map((p) => [p.topicId, p]));
  const learned = stats.reduce((a, s) => a + s.learned, 0);
  const correct = stats.reduce((a, s) => a + s.correct, 0);
  const total = stats.reduce((a, s) => a + s.total, 0);
  const practiced = data.progress.reduce((a, p) => a + (p.practiced ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="学んだカード" value={`${learned}/${data.topics.length}`} />
        <Stat label="正答率" value={total ? `${Math.round((correct / total) * 100)}%` : '-'} />
        <Stat label="やってみた" value={`${practiced} 回`} />
      </div>
      <section className="space-y-1">
        <h3 className="text-sm font-semibold">分野ごと</h3>
        {option && (
          <EChart
            option={option}
            ariaLabel="分野ごとの正答率と進み具合"
            className="h-64"
            onClick={(e) => setCategory(stats[e.dataIndex]?.category ?? null)}
          />
        )}
        <p className="text-xs text-slate-500">
          棒を押すと、その分野のカードごとの記録を表示します。
        </p>
      </section>
      {category && (
        <section className="space-y-1">
          <h3 className="text-sm font-semibold">
            {TOPIC_CATEGORIES[category as TopicCategory] ?? category}
          </h3>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm dark:divide-slate-800 dark:border-slate-800">
            {data.topics
              .filter((t) => t.category === category)
              .map((t) => {
                const p = byId.get(t.id);
                const c = p?.reviews.reduce((a, r) => a + r.correct, 0) ?? 0;
                const n = p?.reviews.reduce((a, r) => a + r.total, 0) ?? 0;
                return (
                  <li key={t.id}>
                    <Link
                      href={`/learn/${t.id}`}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <span className="min-w-0 flex-1 truncate">{t.title}</span>
                      <span className="shrink-0 text-xs text-slate-500">
                        {n
                          ? `${Math.round((c / n) * 100)}%（${p!.reviews.length} 回）`
                          : p?.readAt
                            ? '読んだ'
                            : '未読'}
                        {p?.due && `・復習 ${formatShortDate(p.due)}`}
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-slate-400" />
                    </Link>
                  </li>
                );
              })}
          </ul>
        </section>
      )}
    </div>
  );
}
