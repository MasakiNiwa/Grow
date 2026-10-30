import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/Button';

/** 分析ツールで、まだデータがないときの表示 */
export function EmptyState({
  icon: Icon,
  children,
  href,
  action,
}: {
  icon: LucideIcon;
  children: ReactNode;
  href: string;
  action: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
      <Icon className="size-8 text-slate-400" />
      <div>{children}</div>
      <Link href={href}>
        <Button variant="primary" size="sm">
          {action}
        </Button>
      </Link>
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-2.5 text-center dark:bg-slate-800/50">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[0.7rem] text-slate-500">{label}</div>
    </div>
  );
}
