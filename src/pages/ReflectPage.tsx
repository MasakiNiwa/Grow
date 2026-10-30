import { Suspense } from 'react';
import { useLocation, useParams } from 'wouter';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils/cn';
import { ANALYSIS_TOOLS } from '@/features/reflect/tools';

/** ふりかえる: 分析ツールを選んで、記録を分析する */
export default function ReflectPage() {
  const { tool } = useParams<{ tool?: string }>();
  const [, navigate] = useLocation();
  const current = ANALYSIS_TOOLS.find((t) => t.id === tool) ?? ANALYSIS_TOOLS[0];
  const Tool = current.component;
  return (
    <>
      <PageHeader title="ふりかえる" />
      <PageBody wide>
        <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="分析ツール">
          {ANALYSIS_TOOLS.map((t) => {
            const active = t.id === current.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => navigate(`/reflect/${t.id}`, { replace: true })}
                className={cn(
                  'flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-colors',
                  active
                    ? 'border-accent-400 bg-accent-50 dark:border-accent-700 dark:bg-accent-900/30'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900',
                )}
              >
                <t.icon className="size-5 text-accent-600 dark:text-accent-400" />
                <span className="text-sm font-semibold">{t.title}</span>
                <span className="text-xs text-slate-500 max-sm:hidden dark:text-slate-400">
                  {t.description}
                </span>
              </button>
            );
          })}
        </div>
        <Card className="p-4">
          <Suspense fallback={<div className="h-64" />}>
            <Tool />
          </Suspense>
        </Card>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          分析ツールは順次追加します（トレーニングの記録・日々のコンディションなど）。
        </p>
      </PageBody>
    </>
  );
}
