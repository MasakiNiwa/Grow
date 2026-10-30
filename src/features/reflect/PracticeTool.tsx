import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Dumbbell } from 'lucide-react';
import { Link } from 'wouter';
import { EChart } from '@/components/charts/EChart';
import { useChartTheme } from '@/components/charts/useChartTheme';
import { Button } from '@/components/ui/Button';
import { db } from '@/lib/db/db';
import { analysis } from '@/lib/analysis/client';
import { formatDateTime } from '@/lib/utils/format';
import { weekStart, type PracticeSummary } from '@/lib/analysis/analysis';
import { getScenario } from '@/features/practice/practiceData';
import { PRACTICE_KIND_LABELS, type PracticeKind } from '@/features/practice/types';

const KINDS = Object.keys(PRACTICE_KIND_LABELS) as PracticeKind[];

/** 練習の記録: 週ごとの回数（種類別）・ロールプレイの得点の推移・考え方の整理の効果。棒を押すとその週の記録 */
export default function PracticeTool() {
  const logs = useLiveQuery(() => db.logs.toArray(), []);
  const theme = useChartTheme();
  const [summary, setSummary] = useState<PracticeSummary | null>(null);
  const [week, setWeek] = useState<string | null>(null);

  useEffect(() => {
    if (!logs) return;
    void analysis().practiceSummary(logs).then(setSummary);
  }, [logs]);

  const weeklyOption = useMemo(() => {
    if (!theme || !summary) return null;
    return {
      color: theme.series,
      grid: { left: 8, right: 8, top: 40, bottom: 8, containLabel: true },
      legend: { top: 0, type: 'scroll', textStyle: { color: theme.text } },
      tooltip: {
        trigger: 'axis',
        backgroundColor: theme.surface,
        borderColor: theme.grid,
        textStyle: { color: theme.text },
      },
      xAxis: {
        type: 'category',
        data: summary.weekly.map((w) => w.week.slice(5).replace('-', '/') + '〜'),
        axisLabel: { color: theme.muted },
        axisLine: { lineStyle: { color: theme.grid } },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: theme.muted },
        splitLine: { lineStyle: { color: theme.grid } },
      },
      series: KINDS.map((k) => ({
        name: PRACTICE_KIND_LABELS[k],
        type: 'bar',
        stack: 'all',
        barMaxWidth: 36,
        data: summary.weekly.map((w) => w.counts[k] ?? 0),
      })),
    };
  }, [theme, summary]);

  const scoreOption = useMemo(() => {
    if (!theme || !summary || summary.roleplay.length === 0) return null;
    return {
      color: [theme.series[0], theme.series[1]],
      grid: { left: 8, right: 16, top: 32, bottom: 8, containLabel: true },
      legend: { top: 0, textStyle: { color: theme.text } },
      tooltip: {
        trigger: 'item',
        backgroundColor: theme.surface,
        borderColor: theme.grid,
        textStyle: { color: theme.text },
        formatter: (p: { data: [number, number, string] }) =>
          `${getScenario(p.data[2])?.title ?? ''}<br/>${formatDateTime(p.data[0])}：${p.data[1]} %`,
      },
      xAxis: {
        type: 'time',
        axisLabel: { color: theme.muted },
        axisLine: { lineStyle: { color: theme.grid } },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: { color: theme.muted },
        splitLine: { lineStyle: { color: theme.grid } },
      },
      series: (['roleplay', 'ai-roleplay'] as const).map((k) => ({
        name: PRACTICE_KIND_LABELS[k],
        type: 'line',
        symbolSize: 8,
        data: summary.roleplay
          .filter((r) => r.kind === k)
          .map((r) => [r.at, r.ratio, r.scenarioId]),
      })),
    };
  }, [theme, summary]);

  if (!logs || !summary) return null;
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center text-sm text-slate-500">
        <Dumbbell className="size-8 text-slate-400" />
        まだ練習の記録がありません。
        <Link href="/practice">
          <Button variant="primary" size="sm">
            練習する
          </Button>
        </Link>
      </div>
    );
  }

  const weekLogs = week
    ? logs.filter((l) => weekStart(l.createdAt) === week).sort((a, b) => b.createdAt - a.createdAt)
    : [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="練習の回数" value={`${logs.length}`} />
        <Stat
          label="ロールプレイ平均"
          value={
            summary.roleplay.length
              ? `${Math.round(summary.roleplay.reduce((a, r) => a + r.ratio, 0) / summary.roleplay.length)}%`
              : '-'
          }
        />
        <Stat
          label="整理で気持ちが"
          value={summary.reframe.averageDrop !== null ? `−${summary.reframe.averageDrop}` : '-'}
        />
      </div>
      <section className="space-y-1">
        <h3 className="text-sm font-semibold">週ごとの回数</h3>
        {weeklyOption && (
          <EChart
            option={weeklyOption}
            ariaLabel="週ごとの練習の回数のグラフ"
            className="h-60"
            onClick={(e) => setWeek(summary.weekly[e.dataIndex]?.week ?? null)}
          />
        )}
        <p className="text-xs text-slate-500">棒を押すと、その週の記録を表示します。</p>
        {week && (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm dark:divide-slate-800 dark:border-slate-800">
            {weekLogs.map((l) => (
              <li key={l.id} className="flex justify-between gap-2 px-3 py-2">
                <span>{PRACTICE_KIND_LABELS[l.kind]}</span>
                <span className="text-xs text-slate-500">{formatDateTime(l.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {scoreOption && (
        <section className="space-y-1">
          <h3 className="text-sm font-semibold">ロールプレイの得点（%）</h3>
          <EChart option={scoreOption} ariaLabel="ロールプレイの得点の推移" className="h-56" />
        </section>
      )}
      {summary.distortions.length > 0 && (
        <section className="space-y-1">
          <h3 className="text-sm font-semibold">よく出る考え方のくせ</h3>
          <ul className="flex flex-wrap gap-1.5 text-sm">
            {summary.distortions.map((d) => (
              <li
                key={d.name}
                className="rounded-full bg-slate-100 px-2.5 py-0.5 dark:bg-slate-800"
              >
                {d.name} × {d.count}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-2.5 dark:bg-slate-800/50">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[0.7rem] text-slate-500">{label}</div>
    </div>
  );
}
