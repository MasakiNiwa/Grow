import { Suspense } from 'react';
import { HeartPulse } from 'lucide-react';
import { Link, useLocation, useParams } from 'wouter';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils/cn';
import { AiAnalysisPanel } from '@/features/reflect/AiAnalysisPanel';
import { ANALYSIS_TOOLS, TOOL_GROUPS } from '@/features/reflect/tools';

/** ふりかえる: 分析ツールを選んで、記録を分析する（ツールはまとまりごとに並べる） */
export default function ReflectPage() {
  const { tool } = useParams<{ tool?: string }>();
  const [, navigate] = useLocation();
  const current = ANALYSIS_TOOLS.find((t) => t.id === tool) ?? ANALYSIS_TOOLS[0];
  const Tool = current.component;
  const groups = Object.keys(TOOL_GROUPS) as (keyof typeof TOOL_GROUPS)[];
  return (
    <>
      <PageHeader
        title="ふりかえる"
        actions={
          <Link href="/checkin" className="max-sm:hidden">
            <Button size="sm">
              <HeartPulse />
              チェックイン
            </Button>
          </Link>
        }
      />
      <PageBody wide>
        <nav aria-label="分析ツール" className="space-y-2">
          {groups.map((g) => (
            <div key={g} className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-[0.7rem] font-semibold text-slate-500 sm:w-20 sm:text-xs">
                {TOOL_GROUPS[g]}
              </span>
              <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5">
                {ANALYSIS_TOOLS.filter((t) => t.group === g).map((t) => {
                  const active = t.id === current.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-current={active ? 'page' : undefined}
                      onClick={() => navigate(`/reflect/${t.id}`, { replace: true })}
                      className={cn(
                        'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                        active
                          ? 'border-accent-400 bg-accent-50 font-medium text-accent-800 dark:border-accent-700 dark:bg-accent-900/30 dark:text-accent-200'
                          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900',
                      )}
                    >
                      <t.icon className="size-4" />
                      {t.title}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <Card className="space-y-3 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">{current.description}</p>
          <Suspense fallback={<div className="h-64" />}>
            <Tool />
          </Suspense>
        </Card>
        <AiAnalysisPanel />
      </PageBody>
    </>
  );
}
