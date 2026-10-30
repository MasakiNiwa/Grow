import { useEffect, useMemo, useState } from 'react';
import { EChart } from '@/components/charts/EChart';
import { useChartTheme } from '@/components/charts/useChartTheme';
import { Chip } from '@/components/ui/Chip';
import { analysis } from '@/lib/analysis/client';
import { formatDateTime, formatShortDate } from '@/lib/utils/format';
import { BIG_FIVE_FULL, BIG_FIVE_DOMAINS } from '@/features/assess/instruments/bigfive';
import type { TrendPoint } from '@/lib/analysis/analysis';
import { EmptyResults } from './EmptyResults';
import { useBigFiveResults } from './useResults';

const scaleLabel = new Map(BIG_FIVE_FULL.scales.map((s) => [s.id, s.label]));

/** 推移: 5 つの特性（または選んだ特性の側面）の折れ線 */
export default function TrendTool() {
  const results = useBigFiveResults();
  const theme = useChartTheme();
  const [points, setPoints] = useState<TrendPoint[]>([]);
  const [focus, setFocus] = useState<string | null>(null);

  useEffect(() => {
    if (!results) return;
    void analysis().trend(results, 'bigfive').then(setPoints);
  }, [results]);

  const scaleIds = focus
    ? BIG_FIVE_FULL.scales.filter((s) => s.parent === focus).map((s) => s.id)
    : BIG_FIVE_DOMAINS;

  const option = useMemo(() => {
    if (!theme) return null;
    return {
      color: focus
        ? [theme.series[BIG_FIVE_DOMAINS.indexOf(focus)], ...theme.series]
        : theme.series,
      grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
      legend: { top: 0, textStyle: { color: theme.text }, type: 'scroll' },
      tooltip: {
        trigger: 'axis',
        backgroundColor: theme.surface,
        borderColor: theme.grid,
        textStyle: { color: theme.text },
      },
      xAxis: {
        type: 'category',
        data: points.map((p, i) =>
          // 同じ日に複数あるときは時刻も出す
          points.some(
            (q, j) => j !== i && formatShortDate(q.createdAt) === formatShortDate(p.createdAt),
          )
            ? formatDateTime(p.createdAt).slice(5)
            : formatShortDate(p.createdAt),
        ),
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
      series: scaleIds.map((id, i) => ({
        name: scaleLabel.get(id),
        type: 'line',
        smooth: true,
        symbolSize: 7,
        lineStyle: focus && i > 0 ? { type: 'dashed', width: 1.5 } : { width: 2.5 },
        data: points.map((p) => p.pomp[id] ?? null),
      })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, points, focus]);

  if (results && results.length === 0) return <EmptyResults />;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        <Chip active={focus === null} onClick={() => setFocus(null)}>
          5 つの特性
        </Chip>
        {BIG_FIVE_DOMAINS.map((d) => (
          <Chip key={d} active={focus === d} onClick={() => setFocus(d)}>
            {scaleLabel.get(d)}の側面
          </Chip>
        ))}
      </div>
      {option && <EChart option={option} ariaLabel="特性の推移のグラフ" className="h-80" />}
      {points.length === 1 && (
        <p className="text-xs text-slate-500">
          結果が 1
          つだけなので点になっています。期間をあけてもう一度診断すると、変化が線で見られます。
        </p>
      )}
    </div>
  );
}
