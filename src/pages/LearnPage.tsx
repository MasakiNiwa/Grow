import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpenCheck, CalendarClock, ChevronRight, Sparkles, Wand2 } from 'lucide-react';
import { Link } from 'wouter';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { db } from '@/lib/db/db';
import { cn } from '@/lib/utils/cn';
import { formatShortDate } from '@/lib/utils/format';
import { scaleFamily } from '@/features/assess/registry';
import { allTopics, recommendTopics } from '@/features/learn/topics';
import { LearnCreateDialog } from '@/features/learn/LearnCreateDialog';
import { TOPIC_CATEGORIES, type Topic, type TopicProgress } from '@/features/learn/types';

function TopicRow({
  topic,
  progress,
  extra,
}: {
  topic: Topic;
  progress?: TopicProgress;
  extra?: string;
}) {
  const due = progress?.due;
  return (
    <Link
      href={`/learn/${topic.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40"
    >
      <span
        className={cn(
          'size-2.5 shrink-0 rounded-full',
          progress?.reviews.length
            ? 'bg-accent-500'
            : progress?.readAt
              ? 'bg-accent-300 dark:bg-accent-700'
              : 'bg-slate-300 dark:bg-slate-700',
        )}
        title={progress?.reviews.length ? 'クイズ済み' : progress?.readAt ? '読んだ' : '未読'}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{topic.title}</div>
        <div className="truncate text-xs text-slate-500 dark:text-slate-400">
          {extra ?? topic.summary}
        </div>
      </div>
      {due && <span className="shrink-0 text-xs text-slate-500">復習 {formatShortDate(due)}</span>}
      <ChevronRight className="size-4 shrink-0 text-slate-400" />
    </Link>
  );
}

/** 学ぶ: 考え方カードの一覧（おすすめ・復習・分野ごと） */
export default function LearnPage() {
  const [creating, setCreating] = useState(false);
  const topics = useLiveQuery(() => allTopics(), []);
  const progress = useLiveQuery(() => db.progress.toArray(), []);
  const latest = useLiveQuery(async () => {
    const all = await db.results.orderBy('createdAt').reverse().toArray();
    return all.find((r) => scaleFamily(r.instrumentId) === 'bigfive') ?? null;
  }, []);
  // 開いた時点を「今」とする（描画のたびに時刻を読まない）
  const [now] = useState(() => Date.now());
  const byId = useMemo(() => new Map(progress?.map((p) => [p.topicId, p])), [progress]);

  if (!topics || !progress) return <PageHeader title="学ぶ" />;
  const dueTopics = topics.filter((t) => (byId.get(t.id)?.due ?? Infinity) <= now);
  const readIds = new Set(progress.filter((p) => p.readAt).map((p) => p.topicId));
  const recs = latest ? recommendTopics(topics, latest.scores, readIds) : [];
  const learned = topics.filter((t) => byId.get(t.id)?.reviews.length).length;

  return (
    <>
      <PageHeader title="学ぶ" />
      <PageBody>
        <div className="flex items-center gap-3">
          <p className="flex-1 text-sm text-slate-600 dark:text-slate-400">
            社会で生きていくための考え方を、短いカードとクイズで。クイズの結果から、忘れかけたころに復習を出します。
          </p>
          <span className="shrink-0 rounded-full bg-accent-50 px-3 py-1 text-xs text-accent-800 dark:bg-accent-900/30 dark:text-accent-200">
            <BookOpenCheck className="mr-1 inline size-3.5" />
            {learned}/{topics.length}
          </span>
        </div>

        {dueTopics.length > 0 && (
          <section className="space-y-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400">
              <CalendarClock className="size-4" />
              今日の復習（{dueTopics.length}）
            </h2>
            <Card className="divide-y divide-slate-100 dark:divide-slate-800">
              {dueTopics.map((t) => (
                <TopicRow key={t.id} topic={t} progress={byId.get(t.id)} />
              ))}
            </Card>
          </section>
        )}

        {recs.length > 0 && (
          <section className="space-y-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400">
              <Sparkles className="size-4" />
              あなたへのおすすめ
            </h2>
            <Card className="divide-y divide-slate-100 dark:divide-slate-800">
              {recs.map(({ topic, reasons }) => (
                <TopicRow
                  key={topic.id}
                  topic={topic}
                  progress={byId.get(topic.id)}
                  extra={`${reasons.join('・')}の人に`}
                />
              ))}
            </Card>
          </section>
        )}
        {!latest && (
          <p className="text-xs text-slate-500">
            <Link href="/know" className="text-accent-700 underline dark:text-accent-300">
              性格診断
            </Link>
            を受けると、あなたの傾向に合ったおすすめが出ます。
          </p>
        )}

        {(Object.keys(TOPIC_CATEGORIES) as (keyof typeof TOPIC_CATEGORIES)[]).map((cat) => {
          const list = topics.filter((t) => t.category === cat);
          if (list.length === 0) return null;
          return (
            <section key={cat} className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {TOPIC_CATEGORIES[cat]}
              </h2>
              <Card className="divide-y divide-slate-100 dark:divide-slate-800">
                {list.map((t) => (
                  <TopicRow key={t.id} topic={t} progress={byId.get(t.id)} />
                ))}
              </Card>
            </section>
          );
        })}

        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="flex-1 text-sm">
            <div className="font-semibold">カードを増やす</div>
            <p className="text-slate-600 dark:text-slate-400">
              テーマを決めてプロンプトをコピーし、外部の AI（ChatGPT・Claude・Gemini など）が返した
              JSON を取り込みます。
            </p>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Wand2 />
            外部の AI で作る
          </Button>
        </Card>
      </PageBody>
      <LearnCreateDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
