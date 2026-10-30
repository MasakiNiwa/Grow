import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { PILLAR_ITEMS } from '@/app/navItems';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { db } from '@/lib/db/db';
import { APP_TITLE } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils/format';
import { scaleFamily } from '@/features/assess/registry';
import { growTypeOf } from '@/features/assess/instruments/bigfiveTypes';

/** ホーム: 4 つの柱の入口と、今の自分のまとめ */
export default function HomePage() {
  const latest = useLiveQuery(async () => {
    const all = await db.results.orderBy('createdAt').reverse().toArray();
    return all.find((r) => scaleFamily(r.instrumentId) === 'bigfive') ?? null;
  }, []);
  const type = latest ? growTypeOf(latest.scores) : null;

  return (
    <>
      <PageHeader title={APP_TITLE} />
      <PageBody>
        <section className="space-y-1 pt-1">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            知る、学ぶ、練習する、ふりかえる。
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Grow は、自分の傾向を知って、少しずつ人として成長していくためのアプリです。
          </p>
        </section>

        {latest === null && (
          <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <div className="font-semibold">まずは性格診断から</div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                60 問・約 7 分。あなたの Grow タイプと、5 つの特性が分かります。
              </p>
            </div>
            <Link href="/know/take/bigfive-60">
              <Button variant="primary">
                はじめる
                <ArrowRight />
              </Button>
            </Link>
          </Card>
        )}

        {latest && type && (
          <Link href={`/know/result/${latest.id}`} className="block">
            <Card className="flex items-center gap-3 p-4 hover:border-accent-300 dark:hover:border-accent-700">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-accent-700 dark:text-accent-300">
                  あなたの Grow タイプ（{formatDateTime(latest.createdAt)}）
                </div>
                <div className="text-lg font-bold">{type.name}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">{type.catchphrase}</div>
              </div>
              <ChevronRight className="size-5 text-slate-400" />
            </Card>
          </Link>
        )}

        <section className="grid gap-3 sm:grid-cols-2">
          {PILLAR_ITEMS.map((p, i) => (
            <Link key={p.to} href={p.to} className="block">
              <Card className="flex h-full items-start gap-3 p-4 hover:border-accent-300 dark:hover:border-accent-700">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
                  <p.icon className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-slate-400">STEP {i + 1}</div>
                  <div className="font-semibold">{p.label}</div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{p.description}</p>
                </div>
              </Card>
            </Link>
          ))}
        </section>
      </PageBody>
    </>
  );
}
