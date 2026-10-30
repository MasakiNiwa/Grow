import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { Card } from '@/components/ui/Card';
import { db } from '@/lib/db/db';
import { streakDays } from './checkinData';
import { MOOD_FACES, localDate } from './types';

/** ホーム: 今日のチェックイン（顔を押すとその気分で記録画面へ） */
export function CheckinCard() {
  const [, navigate] = useLocation();
  const [today] = useState(() => localDate(Date.now()));
  const dates = useLiveQuery(
    async () => (await db.checkins.orderBy('date').uniqueKeys()) as string[],
    [],
  );
  const todays = useLiveQuery(() => db.checkins.where('date').equals(today).toArray(), [today]);
  if (!dates || !todays) return null;
  const streak = streakDays(dates, today);
  if (todays.length > 0) {
    const last = todays.at(-1)!;
    return (
      <Link href="/reflect/condition" className="block">
        <Card className="flex items-center gap-3 p-4 hover:border-accent-300 dark:hover:border-accent-700">
          <span className="text-3xl">{MOOD_FACES[last.mood - 1]}</span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">今日のチェックイン済み</div>
            <div className="text-xs text-slate-500">
              {streak} 日連続・コンディションの分析を見る
            </div>
          </div>
          <ChevronRight className="size-5 text-slate-400" />
        </Card>
      </Link>
    );
  }
  return (
    <Card className="space-y-2 p-4">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-semibold">今日の気分は？</span>
        {streak > 0 && <span className="text-xs text-slate-500">{streak} 日連続中</span>}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {MOOD_FACES.map((f, i) => (
          <button
            key={f}
            type="button"
            onClick={() => navigate(`/checkin?mood=${i + 1}`)}
            aria-label={`気分 ${i + 1}`}
            className="h-12 rounded-xl border border-slate-200 bg-white text-2xl hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            {f}
          </button>
        ))}
      </div>
    </Card>
  );
}
