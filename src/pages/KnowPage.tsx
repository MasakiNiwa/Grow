import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, Clock, ListChecks, PlayCircle } from 'lucide-react';
import { Link } from 'wouter';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Card } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { db } from '@/lib/db/db';
import { formatDateTime } from '@/lib/utils/format';
import { CATEGORY_LABELS, INSTRUMENTS, getInstrument } from '@/features/assess/registry';
import { resultHeadline } from '@/features/assess/headline';

/** 知る: 診断の一覧と、これまでの結果 */
export default function KnowPage() {
  const drafts = useLiveQuery(() => db.drafts.toArray(), []);
  const results = useLiveQuery(() => db.results.orderBy('createdAt').reverse().toArray(), []);
  return (
    <>
      <PageHeader title="知る" />
      <PageBody>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          まずは自分の傾向をつかみましょう。結果は良い・悪いではなく、
          <strong>強みの活かし方と、気をつけたいところ</strong>を知るための手がかりです。
        </p>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">診断</h2>
          {INSTRUMENTS.map((inst) => {
            const draft = drafts?.find((d) => d.instrumentId === inst.id);
            const answered = draft ? Object.keys(draft.answers).length : 0;
            return (
              <Link key={inst.id} href={`/know/take/${inst.id}`} className="block">
                <Card className="flex items-center gap-4 p-4 transition-colors hover:border-accent-300 dark:hover:border-accent-700">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
                    <PlayCircle className="size-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2">
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.7rem] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {CATEGORY_LABELS[inst.category]}
                      </span>
                      <h3 className="font-semibold">{inst.title}</h3>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                      {inst.summary}
                    </p>
                    <div className="mt-1 flex gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <ListChecks className="size-3.5" />
                        {inst.items.length} 問
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5" />約 {inst.minutes} 分
                      </span>
                    </div>
                    {draft && answered > 0 && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-accent-700 dark:text-accent-300">
                        <Progress value={answered / inst.items.length} className="h-1.5 max-w-40" />
                        続きから（{answered}/{inst.items.length}）
                      </div>
                    )}
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-slate-400" />
                </Card>
              </Link>
            );
          })}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            認知のくせなどの診断も、順次追加します。
          </p>
        </section>

        {results && results.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              これまでの結果
            </h2>
            <Card className="divide-y divide-slate-100 dark:divide-slate-800">
              {results.map((r) => {
                const inst = getInstrument(r.instrumentId);
                const headline = resultHeadline(r);
                return (
                  <Link
                    key={r.id}
                    href={`/know/result/${r.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {headline || (inst?.title ?? r.instrumentId)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDateTime(r.createdAt)}・{inst?.title ?? r.instrumentId}
                      </div>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-slate-400" />
                  </Link>
                );
              })}
            </Card>
          </section>
        )}
      </PageBody>
    </>
  );
}
