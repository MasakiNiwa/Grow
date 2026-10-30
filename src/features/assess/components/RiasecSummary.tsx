import { useMemo } from 'react';
import { EChart } from '@/components/charts/EChart';
import { useChartTheme } from '@/components/charts/useChartTheme';
import { Card } from '@/components/ui/Card';
import { RIASEC_EXAMPLES, RIASEC_TYPES } from '../instruments/riasec';
import { riasecCodeOf } from '../headline';
import { scoreMap } from '../scoring';
import type { AssessmentResult } from '../types';

/** 興味・適性（RIASEC）の結果: 六角形のレーダーと、興味のコード（上位 3 つ）の解説 */
export function RiasecSummary({ result }: { result: AssessmentResult }) {
  const theme = useChartTheme();
  const map = scoreMap(result.scores);
  const code = riasecCodeOf(result.scores);
  const option = useMemo(() => {
    if (!theme) return null;
    return {
      radar: {
        indicator: RIASEC_TYPES.map((t) => ({ name: t.label.replace(/（.*）/, ''), max: 100 })),
        axisName: { color: theme.text },
        splitLine: { lineStyle: { color: theme.grid } },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: theme.grid } },
      },
      series: [
        {
          type: 'radar',
          symbolSize: 5,
          lineStyle: { color: theme.accent },
          itemStyle: { color: theme.accent },
          areaStyle: { color: theme.accent, opacity: 0.2 },
          data: [{ value: RIASEC_TYPES.map((t) => map[t.id]?.pomp ?? 0), name: '興味' }],
        },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, result]);

  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div>
        <div className="text-xs font-medium text-accent-700 dark:text-accent-300">
          あなたの興味のコード
        </div>
        <h2 className="mt-1 text-3xl font-bold tracking-widest">{code}</h2>
      </div>
      {option && <EChart option={option} ariaLabel="興味の 6 タイプのレーダー" className="h-64" />}
      <div className="space-y-3">
        {[...code].map((c, i) => {
          const t = RIASEC_TYPES.find((x) => x.id === c)!;
          const ex = RIASEC_EXAMPLES[t.id];
          return (
            <div key={c} className="space-y-1 text-sm">
              <div className="font-semibold">
                {i + 1}. {t.label}
                <span className="ml-1.5 text-xs font-normal text-slate-500">{map[c]?.pomp}</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                {t.description}こと。{ex.tip}
              </p>
              <p className="text-xs text-slate-500">例：{ex.roles.join('・')}</p>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        コードは興味の方向の目安で、向き不向きを決めるものではありません。上位の組み合わせ（例: S と
        A なら「人の役に立つ表現」）に、あなたらしいやりがいのヒントがあります。
      </p>
    </Card>
  );
}
