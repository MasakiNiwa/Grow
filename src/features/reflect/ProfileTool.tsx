import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRightLeft, Link2, UserRound } from 'lucide-react';
import { Link } from 'wouter';
import { db } from '@/lib/db/db';
import { cn } from '@/lib/utils/cn';
import { formatShortDate } from '@/lib/utils/format';
import { resultHeadline } from '@/features/assess/headline';
import { profileLinks } from '@/features/assess/profileLinks';
import { FAMILIES, scaleFamily } from '@/features/assess/registry';
import type { AssessmentResult } from '@/features/assess/types';
import { EmptyState } from './EmptyState';

/** 総合プロフィール: 性格・興味・価値観の最新の結果を並べ、その「つながり」をプログラムが見つける */
export default function ProfileTool() {
  const latest = useLiveQuery(async () => {
    const map = new Map<string, AssessmentResult>();
    for (const r of await db.results.orderBy('createdAt').toArray())
      map.set(scaleFamily(r.instrumentId), r);
    return map;
  }, []);
  if (!latest) return null;
  if (latest.size === 0) {
    return (
      <EmptyState icon={UserRound} href="/know" action="診断を受ける">
        性格・興味・価値観の診断を受けると、3 つを並べて、つながりを見られます。
      </EmptyState>
    );
  }
  const links = profileLinks(
    latest.get('bigfive'),
    latest.get('riasec-48'),
    latest.get('values-30'),
  );
  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-3">
        {FAMILIES.map((f) => {
          const r = latest.get(f.id);
          return (
            <div
              key={f.id}
              className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"
            >
              <div className="text-xs text-slate-500">{f.label}</div>
              {r ? (
                <Link href={`/know/result/${r.id}`} className="block">
                  <div className="font-semibold">{resultHeadline(r)}</div>
                  <div className="text-xs text-slate-500">
                    {formatShortDate(r.createdAt)} の結果 →
                  </div>
                </Link>
              ) : (
                <Link
                  href="/know"
                  className="text-sm text-accent-700 underline dark:text-accent-300"
                >
                  まだ受けていません
                </Link>
              )}
            </div>
          );
        })}
      </div>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">つながり</h3>
        {links.length === 0 ? (
          <p className="text-sm text-slate-500">
            {latest.size < 2
              ? 'もう 1 つ別の診断を受けると、つながりを探せます。'
              : '目立ったつながりは見つかりませんでした（特性が中くらいのときは、どちらの面も持っているということです）。'}
          </p>
        ) : (
          <ul className="space-y-2">
            {links.map((l) => (
              <li
                key={l.title}
                className={cn(
                  'flex gap-2.5 rounded-xl p-3 text-sm',
                  l.kind === 'match'
                    ? 'bg-accent-50 dark:bg-accent-900/25'
                    : 'bg-amber-50 dark:bg-amber-950/30',
                )}
              >
                {l.kind === 'match' ? (
                  <Link2 className="mt-0.5 size-4 shrink-0 text-accent-600 dark:text-accent-400" />
                ) : (
                  <ArrowRightLeft className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                )}
                <div>
                  <div className="font-semibold">{l.title}</div>
                  <p className="text-slate-600 dark:text-slate-400">{l.text}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-slate-500">
          緑は互いに後押しし合う組み合わせ、黄色は葛藤しやすい組み合わせ（悪いことではなく、工夫のしどころ）です。下の「まとめて分析」で、キャラクターにも読み解いてもらえます。
        </p>
      </section>
    </div>
  );
}
