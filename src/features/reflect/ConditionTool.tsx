import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { HeartPulse } from 'lucide-react';
import { Link } from 'wouter';
import { EChart } from '@/components/charts/EChart';
import { useChartTheme } from '@/components/charts/useChartTheme';
import { Button } from '@/components/ui/Button';
import { db } from '@/lib/db/db';
import { analysis } from '@/lib/analysis/client';
import type { ConditionSummary } from '@/lib/analysis/condition';
import { cn } from '@/lib/utils/cn';
import { streakDays } from '@/features/checkin/checkinData';
import { MOOD_FACES, type Checkin } from '@/features/checkin/types';
import { EmptyState, Stat } from './EmptyState';

function EntryList({ entries }: { entries: Checkin[] }) {
  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm dark:divide-slate-800 dark:border-slate-800">
      {entries.map((c) => (
        <li key={c.id} className="space-y-0.5 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{MOOD_FACES[c.mood - 1]}</span>
            <span className="text-xs text-slate-500">
              {c.date} {new Date(c.createdAt).toTimeString().slice(0, 5)}・エネルギー {c.energy}
              ・ストレス {c.stress}
              {c.sleep !== undefined && `・睡眠 ${c.sleep} 時間`}
            </span>
          </div>
          {c.tags.length > 0 && <div className="text-xs text-slate-500">{c.tags.join('・')}</div>}
          {c.note && <p className="text-slate-700 dark:text-slate-300">{c.note}</p>}
        </li>
      ))}
    </ul>
  );
}

/**
 * コンディション: 気分・エネルギー・ストレス・睡眠の推移、曜日ごとの平均、できごと（タグ）ごとの気分。
 * 点や棒を押すと、その日・そのタグの記録を表示する（ドリルダウン）
 */
export default function ConditionTool() {
  const checkins = useLiveQuery(() => db.checkins.orderBy('createdAt').toArray(), []);
  const theme = useChartTheme();
  const [summary, setSummary] = useState<ConditionSummary | null>(null);
  const [focus, setFocus] = useState<{ kind: 'date' | 'tag'; value: string } | null>(null);

  useEffect(() => {
    if (!checkins) return;
    void analysis().conditionSummary(checkins).then(setSummary);
  }, [checkins]);

  const tooltip = theme && {
    backgroundColor: theme.surface,
    borderColor: theme.grid,
    textStyle: { color: theme.text },
  };

  const lineOption = useMemo(() => {
    if (!theme || !summary) return null;
    const hasSleep = summary.daily.some((d) => d.sleep !== null);
    return {
      color: [theme.series[0], theme.series[2], theme.series[3], theme.series[1]],
      grid: {
        left: 8,
        right: hasSleep ? 8 : 16,
        top: 40,
        bottom: summary.daily.length > 14 ? 48 : 8,
        containLabel: true,
      },
      legend: { top: 0, textStyle: { color: theme.text } },
      tooltip: { trigger: 'axis', ...tooltip },
      dataZoom:
        summary.daily.length > 14
          ? [{ type: 'slider', start: 50, end: 100, height: 18, bottom: 8 }]
          : [],
      xAxis: {
        type: 'category',
        data: summary.daily.map((d) => d.date.slice(5).replace('-', '/')),
        axisLabel: { color: theme.muted },
        axisLine: { lineStyle: { color: theme.grid } },
      },
      yAxis: [
        {
          type: 'value',
          min: 1,
          max: 5,
          interval: 1,
          axisLabel: { color: theme.muted },
          splitLine: { lineStyle: { color: theme.grid } },
        },
        ...(hasSleep
          ? [
              {
                type: 'value',
                min: 0,
                max: 12,
                name: '時間',
                nameTextStyle: { color: theme.muted },
                axisLabel: { color: theme.muted },
                splitLine: { show: false },
              },
            ]
          : []),
      ],
      series: [
        {
          name: '気分',
          type: 'line',
          smooth: true,
          symbolSize: 7,
          data: summary.daily.map((d) => d.mood),
        },
        {
          name: 'エネルギー',
          type: 'line',
          smooth: true,
          symbolSize: 5,
          data: summary.daily.map((d) => d.energy),
        },
        {
          name: 'ストレス',
          type: 'line',
          smooth: true,
          symbolSize: 5,
          lineStyle: { type: 'dashed' },
          data: summary.daily.map((d) => d.stress),
        },
        ...(hasSleep
          ? [
              {
                name: '睡眠',
                type: 'bar',
                yAxisIndex: 1,
                barMaxWidth: 14,
                itemStyle: { opacity: 0.35 },
                data: summary.daily.map((d) => d.sleep),
              },
            ]
          : []),
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, summary]);

  const weekdayOption = useMemo(() => {
    if (!theme || !summary) return null;
    return {
      color: [theme.series[0], theme.series[3]],
      grid: { left: 8, right: 8, top: 32, bottom: 8, containLabel: true },
      legend: { top: 0, textStyle: { color: theme.text } },
      tooltip: { trigger: 'axis', ...tooltip },
      xAxis: {
        type: 'category',
        data: summary.weekday.map((w) => w.label),
        axisLabel: { color: theme.muted },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 5,
        axisLabel: { color: theme.muted },
        splitLine: { lineStyle: { color: theme.grid } },
      },
      series: [
        { name: '気分', type: 'bar', barMaxWidth: 18, data: summary.weekday.map((w) => w.mood) },
        {
          name: 'ストレス',
          type: 'bar',
          barMaxWidth: 18,
          data: summary.weekday.map((w) => w.stress),
        },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, summary]);

  const tagOption = useMemo(() => {
    if (!theme || !summary || summary.tags.length === 0) return null;
    const rows = [...summary.tags].reverse();
    return {
      grid: { left: 8, right: 40, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        ...tooltip,
        formatter: (p: { dataIndex: number }) => {
          const t = rows[p.dataIndex];
          return `${t.tag}（${t.count} 回）<br/>気分 ${t.mood}（平均との差 ${t.moodDiff > 0 ? '+' : ''}${t.moodDiff}）<br/>ストレス ${t.stress}`;
        },
      },
      xAxis: {
        type: 'value',
        axisLabel: { color: theme.muted },
        splitLine: { lineStyle: { color: theme.grid } },
      },
      yAxis: {
        type: 'category',
        data: rows.map((t) => `${t.tag}（${t.count}）`),
        axisLabel: { color: theme.text },
        axisTick: { show: false },
      },
      series: [
        {
          type: 'bar',
          barMaxWidth: 16,
          label: {
            show: true,
            position: 'right',
            color: theme.muted,
            formatter: (p: { value: number }) => (p.value > 0 ? `+${p.value}` : `${p.value}`),
          },
          data: rows.map((t) => ({
            value: t.moodDiff,
            itemStyle: {
              color: t.moodDiff >= 0 ? theme.series[0] : theme.series[3],
              borderRadius: 4,
            },
          })),
        },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, summary]);

  if (!checkins || !summary) return null;
  if (checkins.length === 0) {
    return (
      <EmptyState icon={HeartPulse} href="/checkin" action="チェックインする">
        まだチェックインの記録がありません。毎日 1
        分の記録で、気分の波や、調子に影響することが見えてきます。
      </EmptyState>
    );
  }

  const focused =
    focus?.kind === 'date'
      ? checkins.filter((c) => c.date === focus.value)
      : focus?.kind === 'tag'
        ? checkins.filter((c) => c.tags.includes(focus.value))
        : [];
  const streak = streakDays(summary.daily.map((d) => d.date));
  const tagRows = [...summary.tags].reverse();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div className="grid flex-1 grid-cols-3 gap-2">
          <Stat label="記録した日" value={`${summary.overall.days}`} />
          <Stat label="気分の平均" value={`${summary.overall.mood ?? '-'}`} />
          <Stat label="連続" value={`${streak} 日`} />
        </div>
      </div>
      <Link href="/checkin">
        <Button size="sm" variant="primary">
          <HeartPulse />
          今日のチェックイン
        </Button>
      </Link>

      <section className="space-y-1">
        <h3 className="text-sm font-semibold">日ごとの推移</h3>
        {lineOption && (
          <EChart
            option={lineOption}
            ariaLabel="気分・エネルギー・ストレスの推移"
            className="h-72"
            onClick={(e) => {
              const d = summary.daily[e.dataIndex];
              if (d) setFocus({ kind: 'date', value: d.date });
            }}
          />
        )}
        <p className="text-xs text-slate-500">
          点を押すと、その日の記録（メモ・できごと）を表示します。
        </p>
      </section>

      {focus && (
        <section className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="flex-1 text-sm font-semibold">
              {focus.kind === 'date'
                ? `${focus.value} の記録`
                : `「${focus.value}」があった日の記録`}
            </h3>
            <button
              type="button"
              className="text-xs text-accent-700 dark:text-accent-300"
              onClick={() => setFocus(null)}
            >
              閉じる
            </button>
          </div>
          <EntryList entries={[...focused].reverse()} />
        </section>
      )}

      <section className="space-y-1">
        <h3 className="text-sm font-semibold">曜日ごとの平均</h3>
        {weekdayOption && (
          <EChart option={weekdayOption} ariaLabel="曜日ごとの気分とストレス" className="h-52" />
        )}
      </section>

      {tagOption && (
        <section className="space-y-1">
          <h3 className="text-sm font-semibold">できごとと気分</h3>
          <p className="text-xs text-slate-500">
            そのできごとがあった日の気分が、全体の平均より高い（緑）か低い（赤）か。棒を押すと記録を表示します。
          </p>
          <EChart
            option={tagOption}
            ariaLabel="できごとごとの気分"
            className={cn(tagRows.length > 6 ? 'h-80' : 'h-56')}
            onClick={(e) => {
              const t = tagRows[e.dataIndex];
              if (t) setFocus({ kind: 'tag', value: t.tag });
            }}
          />
        </section>
      )}
    </div>
  );
}
