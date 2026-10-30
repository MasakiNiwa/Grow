import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { analysis } from '@/lib/analysis/client';
import { cn } from '@/lib/utils/cn';
import { formatDateTime } from '@/lib/utils/format';
import { BIG_FIVE_FULL } from '@/features/assess/instruments/bigfive';
import type { ScaleDiff } from '@/lib/analysis/analysis';
import { EmptyResults } from './EmptyResults';
import { useBigFiveResults } from './useResults';

const scaleById = new Map(BIG_FIVE_FULL.scales.map((s) => [s.id, s]));

/** 2 回を比べる: 変化の大きい順に並べる */
export default function CompareTool() {
  const results = useBigFiveResults();
  const [beforeId, setBeforeId] = useState('');
  const [afterId, setAfterId] = useState('');
  const [diffs, setDiffs] = useState<ScaleDiff[]>([]);

  // 既定: 最新とその 1 つ前
  const before = beforeId || results?.at(-2)?.id || '';
  const after = afterId || results?.at(-1)?.id || '';

  useEffect(() => {
    const a = results?.find((r) => r.id === before);
    const b = results?.find((r) => r.id === after);
    if (!a || !b) return;
    void analysis().compare(a, b).then(setDiffs);
  }, [results, before, after]);

  if (results && results.length < 2) return <EmptyResults need={2} />;
  if (!results) return null;
  const options = results.map((r) => ({ value: r.id, label: formatDateTime(r.createdAt) }));
  const max = Math.max(10, ...diffs.map((d) => Math.abs(d.diff)));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Select value={before} options={options} onChange={setBeforeId} />
        <span>→</span>
        <Select value={after} options={options} onChange={setAfterId} />
      </div>
      <ul className="space-y-1">
        {diffs.map((d) => {
          const scale = scaleById.get(d.scaleId);
          if (!scale) return null;
          const up = d.diff >= 0;
          return (
            <li
              key={d.scaleId}
              className="grid grid-cols-[8rem_1fr_4rem] items-center gap-2 text-sm"
            >
              <span className={cn('truncate', !scale.parent && 'font-semibold')}>
                {scale.label}
              </span>
              <div className="relative h-2.5 rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="absolute inset-y-0 left-1/2 w-px bg-slate-300 dark:bg-slate-600" />
                <div
                  className={cn(
                    'absolute inset-y-0 rounded-full',
                    up ? 'left-1/2 bg-accent-500' : 'right-1/2 bg-rose-400',
                  )}
                  style={{ width: `${(Math.abs(d.diff) / max) * 50}%` }}
                />
              </div>
              <span className="flex items-center justify-end gap-0.5 font-mono text-xs">
                {d.diff !== 0 &&
                  (up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                {Math.abs(d.diff)}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        太字は 5 つの特性、それ以外は側面。10
        以内の変化は、その日の気分などによる揺れの範囲かもしれません。
      </p>
    </div>
  );
}
