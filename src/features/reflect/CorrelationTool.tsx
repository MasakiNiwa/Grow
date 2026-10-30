import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Network } from 'lucide-react';
import { EChart } from '@/components/charts/EChart';
import { useChartTheme } from '@/components/charts/useChartTheme';
import { db } from '@/lib/db/db';
import { analysis } from '@/lib/analysis/client';
import {
  DAILY_VARIABLES,
  correlationLabel,
  type CorrelationCell,
  type DailyRow,
  type DailyVariable,
} from '@/lib/analysis/condition';
import { EmptyState } from './EmptyState';

const VARS = Object.keys(DAILY_VARIABLES) as DailyVariable[];

/** 最小二乗法の直線（散布図に重ねる） */
function regression(points: [number, number][]): [number, number][] | null {
  if (points.length < 3) return null;
  const n = points.length;
  const mx = points.reduce((a, p) => a + p[0], 0) / n;
  const my = points.reduce((a, p) => a + p[1], 0) / n;
  const sxx = points.reduce((a, p) => a + (p[0] - mx) ** 2, 0);
  if (sxx === 0) return null;
  const b = points.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / sxx;
  const xs = points.map((p) => p[0]);
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  return [
    [lo, my + b * (lo - mx)],
    [hi, my + b * (hi - mx)],
  ];
}

/**
 * 関係を探る: 気分・エネルギー・ストレス・睡眠・練習・クイズの、日ごとの相関。
 * マスを押すと、その 2 つの散布図（ドリルダウン）
 */
export default function CorrelationTool() {
  const data = useLiveQuery(
    async () => ({
      checkins: await db.checkins.toArray(),
      logs: await db.logs.toArray(),
      progress: await db.progress.toArray(),
    }),
    [],
  );
  const theme = useChartTheme();
  const [rows, setRows] = useState<DailyRow[]>([]);
  const [cells, setCells] = useState<CorrelationCell[]>([]);
  const [pair, setPair] = useState<[DailyVariable, DailyVariable]>(['sleep', 'mood']);

  useEffect(() => {
    if (!data) return;
    void (async () => {
      const table = await analysis().dailyTable(data.checkins, data.logs, data.progress);
      setRows(table);
      setCells(await analysis().correlationMatrix(table));
    })();
  }, [data]);

  const heatOption = useMemo(() => {
    if (!theme || cells.length === 0) return null;
    // 下半分だけ（同じ組み合わせを 2 回見せない）
    const shown = cells.filter((c) => VARS.indexOf(c.x) < VARS.indexOf(c.y));
    return {
      grid: { left: 8, right: 8, top: 8, bottom: 56, containLabel: true },
      tooltip: {
        backgroundColor: theme.surface,
        borderColor: theme.grid,
        textStyle: { color: theme.text },
        formatter: (p: { data: [number, number, number | null, number] }) => {
          const [xi, yi, r, n] = p.data;
          return `${DAILY_VARIABLES[VARS[xi]]} × ${DAILY_VARIABLES[VARS[yi]]}<br/>r = ${r ?? '-'}（${correlationLabel(r)}、${n} 日）`;
        },
      },
      xAxis: {
        type: 'category',
        data: VARS.map((v) => DAILY_VARIABLES[v]),
        axisLabel: { color: theme.text, interval: 0, rotate: 30 },
        splitArea: { show: false },
      },
      yAxis: {
        type: 'category',
        data: VARS.map((v) => DAILY_VARIABLES[v]),
        axisLabel: { color: theme.text },
      },
      visualMap: {
        min: -1,
        max: 1,
        dimension: 2,
        calculable: false,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        itemHeight: 120,
        textStyle: { color: theme.muted },
        inRange: { color: [theme.series[3], theme.surface, theme.series[0]] },
      },
      series: [
        {
          type: 'heatmap',
          data: shown.map((c) => [VARS.indexOf(c.x), VARS.indexOf(c.y), c.r, c.n]),
          label: {
            show: true,
            color: theme.text,
            formatter: (p: { data: [number, number, number | null] }) =>
              p.data[2] === null ? '–' : p.data[2].toFixed(2),
          },
          itemStyle: { borderColor: theme.surface, borderWidth: 2, borderRadius: 4 },
        },
      ],
    };
  }, [theme, cells]);

  const points = useMemo(
    () =>
      rows
        .filter((r) => r[pair[0]] !== undefined && r[pair[1]] !== undefined)
        .map((r) => [r[pair[0]]!, r[pair[1]]!] as [number, number]),
    [rows, pair],
  );

  const scatterOption = useMemo(() => {
    if (!theme) return null;
    const line = regression(points);
    return {
      grid: { left: 8, right: 16, top: 16, bottom: 28, containLabel: true },
      tooltip: {
        backgroundColor: theme.surface,
        borderColor: theme.grid,
        textStyle: { color: theme.text },
      },
      xAxis: {
        type: 'value',
        name: DAILY_VARIABLES[pair[0]],
        nameLocation: 'middle',
        nameGap: 24,
        scale: true,
        axisLabel: { color: theme.muted },
        nameTextStyle: { color: theme.muted },
        splitLine: { lineStyle: { color: theme.grid } },
      },
      yAxis: {
        type: 'value',
        name: DAILY_VARIABLES[pair[1]],
        scale: true,
        axisLabel: { color: theme.muted },
        nameTextStyle: { color: theme.muted },
        splitLine: { lineStyle: { color: theme.grid } },
      },
      series: [
        {
          type: 'scatter',
          symbolSize: 10,
          itemStyle: { color: theme.series[1], opacity: 0.7 },
          data: points,
        },
        ...(line
          ? [
              {
                type: 'line',
                symbol: 'none',
                lineStyle: { color: theme.accent, type: 'dashed' },
                data: line,
              },
            ]
          : []),
      ],
    };
  }, [theme, points, pair]);

  if (!data) return null;
  if (data.checkins.length === 0) {
    return (
      <EmptyState icon={Network} href="/checkin" action="チェックインする">
        日々のチェックインを続けると、睡眠と気分、練習とストレスなど、何と何が一緒に動いているかが見えてきます（3
        日以上で計算できます）。
      </EmptyState>
    );
  }
  const cell = cells.find((c) => c.x === pair[0] && c.y === pair[1]);

  return (
    <div className="space-y-5">
      <section className="space-y-1">
        <h3 className="text-sm font-semibold">何と何が一緒に動いている？</h3>
        <p className="text-xs text-slate-500">
          1 に近いほど「一方が高い日はもう一方も高い」、−1
          に近いほど「一方が高い日はもう一方が低い」。マスを押すと、日ごとの点で確かめられます。
        </p>
        {heatOption && (
          <EChart
            option={heatOption}
            ariaLabel="日ごとの変数の相関"
            className="h-96"
            onClick={(e) => {
              const d = e.data as [number, number] | undefined;
              if (d) setPair([VARS[d[0]], VARS[d[1]]]);
            }}
          />
        )}
      </section>
      <section className="space-y-1">
        <h3 className="text-sm font-semibold">
          {DAILY_VARIABLES[pair[0]]} × {DAILY_VARIABLES[pair[1]]}
          <span className="ml-2 text-xs font-normal text-slate-500">
            {cell ? `r = ${cell.r ?? '-'}（${correlationLabel(cell.r)}、${cell.n} 日）` : ''}
          </span>
        </h3>
        {scatterOption && <EChart option={scatterOption} ariaLabel="散布図" className="h-64" />}
        <p className="text-xs text-slate-500">
          相関は「一緒に動いている」ことで、どちらが原因かまでは分かりません。日数が少ないうちは、たまたまのことも多いです。
        </p>
      </section>
    </div>
  );
}
