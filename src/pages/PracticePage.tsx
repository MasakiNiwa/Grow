import { useLiveQuery } from 'dexie-react-hooks';
import {
  Bot,
  ChevronRight,
  Footprints,
  ListChecks,
  NotebookPen,
  Smile,
  Trash2,
} from 'lucide-react';
import { Link } from 'wouter';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { db } from '@/lib/db/db';
import { formatDateTime } from '@/lib/utils/format';
import { useAiReady } from '@/features/cloud/aiClient';
import { SCENARIOS } from '@/features/practice/content/scenarios';
import { deleteLog, getScenario } from '@/features/practice/practiceData';
import { WORKSHEETS } from '@/features/practice/worksheets';
import { PRACTICE_KIND_LABELS, type PracticeLog } from '@/features/practice/types';

function logSummary(log: PracticeLog): string {
  switch (log.kind) {
    case 'roleplay':
      return `${getScenario(log.data.scenarioId)?.title ?? ''}：${log.data.score}/${log.data.maxScore} 点`;
    case 'ai-roleplay':
      return `${getScenario(log.data.scenarioId)?.title ?? ''}${log.data.feedback?.score !== undefined ? `：${log.data.feedback.score} 点` : ''}`;
    case 'reframe':
      return `${log.data.event.slice(0, 30)}（${log.data.before} → ${log.data.after}）`;
    case 'good-things':
      return log.data.items.filter(Boolean).join('・').slice(0, 40);
    case 'if-then':
      return `${log.data.trigger}したら、${log.data.action}`;
  }
}

const WORK_ICONS = { reframe: NotebookPen, 'good-things': Smile, 'if-then': Footprints };

/** 練習: 場面ロールプレイと改善トレーニング */
export default function PracticePage() {
  const aiReady = useAiReady();
  const logs = useLiveQuery(() => db.logs.orderBy('createdAt').reverse().limit(10).toArray(), []);
  return (
    <>
      <PageHeader title="練習" />
      <PageBody>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          学んだ考え方を、場面の練習と小さなトレーニングで身につけましょう。
        </p>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            場面ロールプレイ
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {SCENARIOS.map((s) => (
              <Card key={s.id} className="flex flex-col gap-3 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden>
                    {s.partner.emoji}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold">{s.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{s.summary}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      相手：{s.partner.name}（{s.partner.role}）
                    </p>
                  </div>
                </div>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Link href={`/practice/roleplay/${s.id}`}>
                    <Button size="sm" variant="primary">
                      <ListChecks />
                      選んで練習
                    </Button>
                  </Link>
                  <Link href={`/practice/ai/${s.id}`}>
                    <Button
                      size="sm"
                      disabled={!aiReady}
                      title={aiReady ? undefined : 'AI の設定が必要です'}
                    >
                      <Bot />
                      AI と自由に
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
          {!aiReady && (
            <p className="text-xs text-slate-500">
              「AI と自由に」は、AI を設定すると使えます（AI
              が相手役を演じ、終わったらふりかえりをくれます）。
            </p>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            改善トレーニング
          </h2>
          <Card className="divide-y divide-slate-100 dark:divide-slate-800">
            {WORKSHEETS.map((w) => {
              const Icon = WORK_ICONS[w.kind];
              return (
                <Link
                  key={w.kind}
                  href={`/practice/work/${w.kind}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <Icon className="size-5 shrink-0 text-accent-600 dark:text-accent-400" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{w.title}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{w.summary}</div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-slate-400" />
                </Link>
              );
            })}
          </Card>
        </section>

        {logs && logs.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">最近の記録</h2>
            <Card className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map((l) => (
                <div key={l.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{logSummary(l)}</div>
                    <div className="text-xs text-slate-500">
                      {PRACTICE_KIND_LABELS[l.kind]}・{formatDateTime(l.createdAt)}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="記録を削除"
                    onClick={() => void deleteLog(l.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </Card>
            <Link
              href="/reflect/practice"
              className="block text-right text-xs text-accent-700 dark:text-accent-300"
            >
              ふりかえるで詳しく見る →
            </Link>
          </section>
        )}
      </PageBody>
    </>
  );
}
