import { useEffect, useMemo, useState } from 'react';
import { EChart } from '@/components/charts/EChart';
import { useChartTheme } from '@/components/charts/useChartTheme';
import { Chip } from '@/components/ui/Chip';
import { analysis } from '@/lib/analysis/client';
import { formatDateTime, formatShortDate } from '@/lib/utils/format';
import { familyInstrument } from '@/features/assess/registry';
import type { TrendPoint } from '@/lib/analysis/analysis';
import { EmptyResults } from './EmptyResults';
import { FamilyPicker } from './FamilyPicker';
import { useFamilyResults, useReflectFamily } from './useResults';

/** 推移: 診断のまとまりごとに、上位の尺度（または選んだ尺度の下位）の折れ線 */
export default function TrendTool() {
  const family = useReflectFamily((s) => s.family);
  const inst = familyInstrument(family);
  const results = useFamilyResults(family);
  const scaleLabel = useMemo(() => new Map(inst.scales.map((s) => [s.id, s.label])), [inst]);
  const domains = useMemo(() => inst.scales.filter((s) => !s.parent).map((s) => s.id), [inst]);
  const theme = useChartTheme();
  const [points, setPoints] = useState<TrendPoint[]>([]);
  const [picked, setFocus] = useState<string | null>(null);
  // まとまりを変えたら、ほかのまとまりの選択は無視する
  const focus = picked && domains.includes(picked) ? picked : null;

  useEffect(() => {
    if (!results) return;
    void analysis().trend(results, family).then(setPoints);
  }, [results, family]);

  const scaleIds = focus ? inst.scales.filter((s) => s.parent === focus).map((s) => s.id) : domains;

  const option = useMemo(() => {
    if (!theme) return null;
    return {
      color: focus ? [theme.series[domains.indexOf(focus)], ...theme.series] : theme.series,
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

  if (results && results.length === 0)
    return (
      <div className="space-y-3">
        <FamilyPicker />
        <EmptyResults />
      </div>
    );
  return (
    <div className="space-y-3">
      <FamilyPicker />
      <div className="flex flex-wrap gap-1.5">
        <Chip active={focus === null} onClick={() => setFocus(null)}>
          全体
        </Chip>
        {domains
          .filter((d) => inst.scales.some((s) => s.parent === d))
          .map((d) => (
            <Chip key={d} active={focus === d} onClick={() => setFocus(d)}>
              {scaleLabel.get(d)}の内訳
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
