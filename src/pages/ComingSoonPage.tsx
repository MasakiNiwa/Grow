import type { ReactNode } from 'react';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Card } from '@/components/ui/Card';

/** まだ作っていない柱のページ（予定を見せる） */
export function ComingSoon({
  title,
  lead,
  plans,
}: {
  title: string;
  lead: ReactNode;
  plans: { title: string; body: string }[];
}) {
  return (
    <>
      <PageHeader title={title} />
      <PageBody>
        <p className="text-sm text-slate-600 dark:text-slate-400">{lead}</p>
        <Card className="divide-y divide-slate-100 dark:divide-slate-800">
          {plans.map((p) => (
            <div key={p.title} className="px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{p.title}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.7rem] text-slate-500 dark:bg-slate-800">
                  準備中
                </span>
              </div>
              <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{p.body}</p>
            </div>
          ))}
        </Card>
      </PageBody>
    </>
  );
}
