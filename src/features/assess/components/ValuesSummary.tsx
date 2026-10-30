import { useMemo } from 'react';
import { EChart } from '@/components/charts/EChart';
import { useChartTheme } from '@/components/charts/useChartTheme';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils/cn';
import { VALUES } from '../instruments/values';
import { rankedValues } from '../headline';
import { scoreMap } from '../scoring';
import type { AssessmentResult } from '../types';

const groups = VALUES.scales.filter((s) => !s.parent);

/** 価値観の結果: 相対的な順位と、4 つのまとまりのバランス */
export function ValuesSummary({ result }: { result: AssessmentResult }) {
  const theme = useChartTheme();
  const ranked = rankedValues(result.scores);
  const map = scoreMap(result.scores);
  const option = useMemo(() => {
    if (!theme) return null;
    return {
      radar: {
        indicator: groups.map((g) => ({ name: g.label, max: 100 })),
        axisName: { color: theme.text },
        splitLine: { lineStyle: { color: theme.grid } },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: theme.grid } },
      },
      series: [
        {
          type: 'radar',
          symbolSize: 5,
          lineStyle: { color: theme.series[1] },
          itemStyle: { color: theme.series[1] },
          areaStyle: { color: theme.series[1], opacity: 0.2 },
          data: [{ value: groups.map((g) => map[g.id]?.pomp ?? 0), name: '価値観' }],
        },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, result]);
  const max = Math.max(10, ...ranked.map((r) => Math.abs(r.relative)));

  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div>
        <div className="text-xs font-medium text-accent-700 dark:text-accent-300">
          特に大切にしたいこと
        </div>
        <h2 className="mt-1 text-2xl font-bold">
          {ranked
            .slice(0, 3)
            .map((v) => v.label)
            .join('・')}
        </h2>
      </div>
      {option && <EChart option={option} ariaLabel="価値観の 4 つのまとまり" className="h-60" />}
      <div className="space-y-1">
        <div className="text-sm font-semibold">10 の価値の順位（あなたの平均との差）</div>
        <ul className="space-y-1">
          {ranked.map((v, i) => (
            <li
              key={v.id}
              className="grid grid-cols-[1.5rem_5rem_1fr_3rem] items-center gap-2 text-sm"
            >
              <span className="text-xs text-slate-400">{i + 1}</span>
              <span className={cn(i < 3 && 'font-semibold')}>{v.label}</span>
              <div className="relative h-2.5 rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="absolute inset-y-0 left-1/2 w-px bg-slate-300 dark:bg-slate-600" />
                <div
                  className={cn(
                    'absolute inset-y-0 rounded-full',
                    v.relative >= 0
                      ? 'left-1/2 bg-accent-500'
                      : 'right-1/2 bg-slate-400 dark:bg-slate-600',
                  )}
                  style={{ width: `${(Math.abs(v.relative) / max) * 50}%` }}
                />
              </div>
              <span className="text-right font-mono text-xs text-slate-500">
                {v.relative > 0 ? '+' : ''}
                {v.relative}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        向かい合うまとまり（変化への開放 ↔ 保守、自己高揚 ↔
        自己超越）は、同時に強く求めると葛藤しやすい組み合わせです。迷ったときの判断の軸として使ってみてください。
      </p>
    </Card>
  );
}
