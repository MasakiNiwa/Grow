import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, BookOpen, Dumbbell, NotebookPen, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useLocation, useParams } from 'wouter';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Switch } from '@/components/ui/Switch';
import { db } from '@/lib/db/db';
import { analysis } from '@/lib/analysis/client';
import { cn } from '@/lib/utils/cn';
import { formatDateTime, formatMinutes } from '@/lib/utils/format';
import { getInstrument, scaleFamily } from '@/features/assess/registry';
import { levelOf, LEVEL_LABELS, scoreMap } from '@/features/assess/scoring';
import { deleteResult, updateResultNote } from '@/features/assess/assessData';
import { ScaleDrilldown } from '@/features/assess/components/ScaleDrilldown';
import { growTypeOf, TYPE_AXES } from '@/features/assess/instruments/bigfiveTypes';
import { DOMAIN_INSIGHTS } from '@/features/assess/instruments/bigfiveInsights';
import type { AssessmentResult } from '@/features/assess/types';
import { ResultAiPanel } from '@/features/ai/ResultAiPanel';

function TypeCard({ result }: { result: AssessmentResult }) {
  const type = growTypeOf(result.scores);
  const map = scoreMap(result.scores);
  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div>
        <div className="text-xs font-medium text-accent-700 dark:text-accent-300">
          あなたの Grow タイプ
        </div>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">
          {type.name}
          <span className="ml-2 align-middle text-sm font-medium text-slate-500">
            （{type.stable ? '安定' : '繊細'}）
          </span>
        </h2>
        <p className="mt-1 text-slate-600 dark:text-slate-400">{type.catchphrase}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {TYPE_AXES.map((a) => {
          const p = map[a.id]?.pomp ?? 50;
          const near = Math.abs(p - 50) < 5;
          return (
            <span
              key={a.id}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-xs',
                near
                  ? 'border-dashed border-slate-300 text-slate-500 dark:border-slate-600'
                  : 'border-accent-200 bg-accent-50 text-accent-800 dark:border-accent-800 dark:bg-accent-900/30 dark:text-accent-200',
              )}
              title={near ? '50 に近く、どちらの面もある' : undefined}
            >
              {p >= 50 ? a.high : a.low}
              {near && '（ほぼ中間）'}
            </span>
          );
        })}
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <div className="mb-1 font-semibold">強み</div>
          <ul className="list-disc space-y-0.5 pl-5 text-slate-600 dark:text-slate-400">
            {type.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-1 font-semibold">つまずきやすいところ</div>
          <ul className="list-disc space-y-0.5 pl-5 text-slate-600 dark:text-slate-400">
            {type.pitfalls.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-1 font-semibold">伸ばすヒント</div>
          <ul className="list-disc space-y-0.5 pl-5 text-slate-600 dark:text-slate-400">
            {type.growth.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        タイプは 5 つの特性のうち 4 つの高低の組み合わせで決めた目安です。50
        に近い特性は、どちらの面も持っています。
      </p>
    </Card>
  );
}

function DomainInsights({ result }: { result: AssessmentResult }) {
  const inst = getInstrument(result.instrumentId)!;
  const map = scoreMap(result.scores);
  const domains = inst.scales.filter((s) => !s.parent);
  return (
    <Card className="divide-y divide-slate-100 dark:divide-slate-800">
      {domains.map((d) => {
        const p = map[d.id]?.pomp ?? 50;
        const level = levelOf(p);
        const insight = DOMAIN_INSIGHTS[d.id]?.[level];
        return (
          <div key={d.id} className="space-y-1.5 px-4 py-3">
            <div className="flex items-baseline gap-2">
              <h3 className="font-semibold">{d.label}</h3>
              <span className="text-xs text-slate-500">
                {p}・{LEVEL_LABELS[level]}
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent-500 shadow dark:border-slate-900"
                style={{ left: `${p}%` }}
              />
            </div>
            <div className="flex justify-between text-[0.7rem] text-slate-500">
              <span>{d.lowLabel}</span>
              <span>{d.highLabel}</span>
            </div>
            {insight && (
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {insight.strength}
                {insight.watch}
              </p>
            )}
          </div>
        );
      })}
    </Card>
  );
}

function ResponseStyleNotice({ result }: { result: AssessmentResult }) {
  const [style, setStyle] = useState<{ sameRatio: number; middleRatio: number } | null>(null);
  useEffect(() => {
    void analysis().responseStyle(result.answers).then(setStyle);
  }, [result]);
  if (!style) return null;
  const notes: string[] = [];
  if (style.sameRatio > 0.6) notes.push('同じ選択肢を選んだ割合がとても多いようです。');
  if (style.middleRatio > 0.5) notes.push('「どちらともいえない」が半分以上でした。');
  if (result.durationMs < Object.keys(result.answers).length * 1500)
    notes.push('とても短い時間で回答しています。');
  if (notes.length === 0) return null;
  return (
    <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div>
        {notes.join('')}
        結果は傾向をつかむ目安として見てください。時間のあるときにもう一度試すと、比べられます。
      </div>
    </div>
  );
}

/** 診断の結果 */
export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const result = useLiveQuery(() => db.results.get(id), [id]);
  const all = useLiveQuery(() => db.results.orderBy('createdAt').toArray(), []);
  const [compare, setCompare] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const previous = useMemo(() => {
    if (!result || !all) return undefined;
    const family = scaleFamily(result.instrumentId);
    return all
      .filter((r) => scaleFamily(r.instrumentId) === family && r.createdAt < result.createdAt)
      .at(-1);
  }, [result, all]);

  if (result === undefined) return <PageHeader title="結果" back="/know" />;
  if (result === null || !getInstrument(result.instrumentId)) {
    return (
      <>
        <PageHeader title="結果" back="/know" />
        <PageBody>
          <p>結果が見つかりませんでした。</p>
        </PageBody>
      </>
    );
  }
  const inst = getInstrument(result.instrumentId)!;
  const isBigFive = result.instrumentId.startsWith('bigfive');
  const noteValue = note ?? result.note ?? '';

  return (
    <>
      <PageHeader title="診断の結果" back="/know" />
      <PageBody>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {formatDateTime(result.createdAt)}・{inst.title}・回答時間{' '}
          {formatMinutes(result.durationMs)}
        </div>
        <ResponseStyleNotice result={result} />
        {isBigFive && <TypeCard result={result} />}
        {isBigFive && <ResultAiPanel result={result} />}
        {isBigFive && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">5 つの特性</h2>
            <DomainInsights result={result} />
          </section>
        )}

        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="flex-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              くわしく見る
            </h2>
            {previous && (
              <label className="flex items-center gap-2 text-sm">
                前回と比べる
                <Switch checked={compare} onChange={setCompare} label="前回と比べる" />
              </label>
            )}
          </div>
          <Card className="p-4">
            <ScaleDrilldown
              inst={inst}
              result={result}
              compareTo={compare ? previous : undefined}
            />
          </Card>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">次の一歩</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            <Link href="/learn">
              <Card className="flex h-full items-center gap-3 p-3 text-sm hover:border-accent-300 dark:hover:border-accent-700">
                <BookOpen className="size-5 text-accent-600 dark:text-accent-400" />
                考え方を学ぶ
              </Card>
            </Link>
            <Link href="/practice">
              <Card className="flex h-full items-center gap-3 p-3 text-sm hover:border-accent-300 dark:hover:border-accent-700">
                <Dumbbell className="size-5 text-accent-600 dark:text-accent-400" />
                練習する
              </Card>
            </Link>
            <Link href="/reflect">
              <Card className="flex h-full items-center gap-3 p-3 text-sm hover:border-accent-300 dark:hover:border-accent-700">
                <Sparkles className="size-5 text-accent-600 dark:text-accent-400" />
                推移をふりかえる
              </Card>
            </Link>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400">
            <NotebookPen className="size-4" />
            メモ
          </h2>
          <textarea
            value={noteValue}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => {
              if (note !== null && note !== (result.note ?? '')) {
                void updateResultNote(result.id, note).then(() =>
                  toast.success('メモを保存しました'),
                );
              }
            }}
            rows={3}
            placeholder="気づいたこと・当てはまると思ったこと・意外だったことなど"
            className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </section>

        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 />
            この結果を削除
          </Button>
        </div>
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          この診断は自己理解のための目安で、医学的・心理学的な診断ではありません。出典:{' '}
          {inst.source}
        </p>
      </PageBody>
      <ConfirmDialog
        open={confirmDelete}
        title="この結果を削除しますか？"
        description="削除すると元に戻せません。"
        confirmLabel="削除"
        danger
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          void deleteResult(result.id).then(() => {
            toast.success('削除しました');
            navigate('/know', { replace: true });
          });
        }}
      />
    </>
  );
}
