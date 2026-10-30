import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarRange, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import { Card } from '@/components/ui/Card';
import { weekStartOf } from '@/lib/analysis/weekly';
import { useSettings } from '@/features/settings/settingsStore';
import { loadWeeklyReport } from './weeklyData';

/** ホーム: 先週のレポートができたら知らせる（開いたら消える） */
export function WeeklyCard() {
  const [lastWeek] = useState(() => weekStartOf(Date.now()) - 7 * 86400000);
  const seen = useSettings((s) => s.weeklySeen);
  const report = useLiveQuery(
    () => (seen >= lastWeek ? null : loadWeeklyReport(lastWeek)),
    [lastWeek, seen],
  );
  if (!report || report.empty) return null;
  return (
    <Link href="/reflect/weekly" className="block">
      <Card className="flex items-center gap-3 border-accent-200 bg-accent-50/60 p-4 hover:border-accent-300 dark:border-accent-900 dark:bg-accent-900/20">
        <CalendarRange className="size-6 shrink-0 text-accent-600 dark:text-accent-400" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">先週のふりかえりレポートができました</div>
          <div className="truncate text-xs text-slate-600 dark:text-slate-400">
            {report.highlights[0] ?? '1 週間の記録をまとめました'}
          </div>
        </div>
        <ChevronRight className="size-5 text-slate-400" />
      </Card>
    </Link>
  );
}
