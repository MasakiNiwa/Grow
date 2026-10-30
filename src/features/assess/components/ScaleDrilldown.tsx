import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { EChart } from '@/components/charts/EChart';
import { useChartTheme } from '@/components/charts/useChartTheme';
import { cn } from '@/lib/utils/cn';
import { keyedValue, levelOf, LEVEL_LABELS, scoreMap } from '../scoring';
import type { AssessmentResult, Instrument, ScaleDef } from '../types';

interface ScaleDrilldownProps {
  inst: Instrument;
  result: AssessmentResult;
  /** 比べる結果（あれば薄い棒で重ねる） */
  compareTo?: AssessmentResult;
}

/**
 * 尺度のドリルダウン: 領域 → 側面 → 設問ごとの回答。
 * 棒を押すと一段下へ。パンくずで戻る。
 */
export function ScaleDrilldown({ inst, result, compareTo }: ScaleDrilldownProps) {
  const theme = useChartTheme();
  const [path, setPath] = useState<string[]>([]);
  const current = path.at(-1);
  const scores = useMemo(() => scoreMap(result.scores), [result]);
  const before = useMemo(() => (compareTo ? scoreMap(compareTo.scores) : null), [compareTo]);
  const scaleById = useMemo(() => new Map(inst.scales.map((s) => [s.id, s])), [inst]);
  const children = inst.scales.filter((s) => (s.parent ?? null) === (current ?? null));
  const leafItems =
    children.length === 0 && current ? inst.items.filter((i) => i.scale === current) : [];
  const topIndex = (s: ScaleDef) => {
    let top = s;
    while (top.parent) top = scaleById.get(top.parent)!;
    return inst.scales.filter((x) => !x.parent).indexOf(top);
  };

  const option = useMemo(() => {
    if (!theme || children.length === 0) return null;
    const rows = [...children].reverse(); // 横棒は下から並ぶので、上から元の順に見えるよう逆にする
    return {
      animationDuration: 300,
      grid: { left: 8, right: 36, top: 8, bottom: 24, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: theme.surface,
        borderColor: theme.grid,
        textStyle: { color: theme.text },
        valueFormatter: (v: number) => `${v}`,
      },
      xAxis: {
        type: 'value',
        min: 0,
        max: 100,
        interval: 25,
        axisLabel: { color: theme.muted },
        splitLine: { lineStyle: { color: theme.grid } },
      },
      yAxis: {
        type: 'category',
        data: rows.map((s) => s.label),
        axisLabel: { color: theme.text, fontSize: 12 },
        axisLine: { lineStyle: { color: theme.grid } },
        axisTick: { show: false },
      },
      series: [
        ...(before
          ? [
              {
                name: '前回',
                type: 'bar',
                barWidth: '30%',
                itemStyle: { color: theme.grid, borderRadius: 6 },
                data: rows.map((s) => before[s.id]?.pomp ?? null),
                z: 1,
              },
            ]
          : []),
        {
          name: before ? '今回' : '得点',
          type: 'bar',
          barWidth: before ? '30%' : '60%',
          barGap: '15%',
          label: { show: true, position: 'right', color: theme.muted, fontSize: 11 },
          itemStyle: { borderRadius: 6 },
          data: rows.map((s) => ({
            value: scores[s.id]?.pomp ?? 0,
            itemStyle: { color: theme.series[topIndex(s) % theme.series.length] },
            scaleId: s.id,
          })),
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: theme.muted, type: 'dashed', opacity: 0.5 },
            label: { show: false },
            data: [{ xAxis: 50 }],
          },
          z: 2,
        },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, current, result, compareTo]);

  const crumbs = [
    { id: '', label: 'すべて' },
    ...path.map((id) => ({ id, label: scaleById.get(id)?.label ?? id })),
  ];
  const currentScale = current ? scaleById.get(current) : undefined;

  return (
    <div className="space-y-3">
      <nav aria-label="階層" className="flex flex-wrap items-center gap-1 text-sm">
        {crumbs.map((c, i) => (
          <span key={c.id || 'root'} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 text-slate-400" />}
            <button
              type="button"
              disabled={i === crumbs.length - 1}
              onClick={() => setPath(path.slice(0, i))}
              className={cn(
                'rounded-md px-1.5 py-0.5',
                i === crumbs.length - 1
                  ? 'font-semibold'
                  : 'text-accent-700 hover:bg-accent-50 dark:text-accent-300 dark:hover:bg-accent-900/30',
              )}
            >
              {c.label}
            </button>
          </span>
        ))}
      </nav>

      {currentScale && (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          <strong className="text-slate-800 dark:text-slate-200">{currentScale.label}</strong>：
          {currentScale.description}（{scores[currentScale.id]?.pomp ?? '-'}・
          {LEVEL_LABELS[levelOf(scores[currentScale.id]?.pomp ?? 50)]}）
        </p>
      )}

      {option && (
        <>
          <EChart
            option={option}
            ariaLabel={`${currentScale?.label ?? '全体'}の得点のグラフ`}
            className={children.length > 6 ? 'h-96' : 'h-64'}
            onClick={(e) => {
              const id = (e.data as { scaleId?: string } | undefined)?.scaleId;
              if (id) setPath([...path, id]);
            }}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            棒を押すと、さらに細かく見られます（0〜100。50 が中間）。
            {before && '薄い棒は比べている結果です。'}
          </p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {children.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setPath([...path, s.id])}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="flex-1">
                    {s.label}
                    <span className="ml-1.5 text-xs text-slate-500">
                      {LEVEL_LABELS[levelOf(scores[s.id]?.pomp ?? 50)]}（
                      {(scores[s.id]?.pomp ?? 50) >= 50 ? s.highLabel : s.lowLabel}）
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-slate-400" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {leafItems.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {leafItems.map((item) => {
            const raw = result.answers[item.id];
            const option = inst.options.find((o) => o.value === raw);
            return (
              <li key={item.id} className="flex items-start gap-3 px-3 py-2.5 text-sm">
                <span className="flex-1">
                  {item.text}
                  {item.keyed === -1 && (
                    <span
                      className="ml-1.5 rounded bg-slate-100 px-1 text-[0.65rem] text-slate-500 dark:bg-slate-800"
                      title="当てはまるほど、この側面の得点は低くなる設問"
                    >
                      逆
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-right text-xs text-slate-500 dark:text-slate-400">
                  {raw !== undefined ? (
                    <>
                      <span className="font-mono text-sm text-slate-800 dark:text-slate-200">
                        {raw}
                      </span>
                      <br />
                      {option?.label}
                      <br />
                      <span className="text-[0.65rem]">
                        得点への寄与 {keyedValue(inst, item.keyed, raw)}
                      </span>
                    </>
                  ) : (
                    'この版では未出題'
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
