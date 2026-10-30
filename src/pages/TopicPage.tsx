import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckCircle2, Footprints, Lightbulb, Trash2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation, useParams } from 'wouter';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ClearButton } from '@/components/ui/ClearButton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { db } from '@/lib/db/db';
import { cn } from '@/lib/utils/cn';
import { formatShortDate } from '@/lib/utils/format';
import Markdown from '@/features/chat/markdown/Markdown';
import { BUILTIN_TOPICS } from '@/features/learn/content/topics';
import { deleteCustomTopic, markPracticed, markRead, recordQuiz } from '@/features/learn/learnData';
import { getTopic, tagLabel } from '@/features/learn/topics';
import { TopicAsk } from '@/features/learn/TopicAsk';
import { shuffleQuiz } from '@/features/learn/shuffleQuiz';
import { TOPIC_CATEGORIES, type Topic } from '@/features/learn/types';

function Quiz({ topic: original, onReset }: { topic: Topic; onReset: number }) {
  // 選択肢の順番は開くたび（クリアするたび）に混ぜる
  const [topic, setTopic] = useState(() => ({
    ...original,
    quiz: original.quiz.map((q) => shuffleQuiz(q)),
  }));
  const [answers, setAnswers] = useState<(number | null)[]>(() => original.quiz.map(() => null));
  const [saved, setSaved] = useState<number | null>(null);
  const [prevReset, setPrevReset] = useState(onReset);
  if (prevReset !== onReset) {
    setPrevReset(onReset);
    setTopic({ ...original, quiz: original.quiz.map((q) => shuffleQuiz(q)) });
    setAnswers(original.quiz.map(() => null));
    setSaved(null);
  }

  const choose = (qi: number, ci: number) => {
    if (answers[qi] !== null) return;
    const next = answers.map((a, i) => (i === qi ? ci : a));
    setAnswers(next);
    if (next.every((a) => a !== null)) {
      const correct = next.filter((a, i) => a === topic.quiz[i].answer).length;
      void recordQuiz(topic.id, correct, topic.quiz.length).then((p) => setSaved(p.due ?? null));
    }
  };

  const done = answers.every((a) => a !== null);
  const correct = answers.filter((a, i) => a === topic.quiz[i].answer).length;

  return (
    <div className="space-y-5">
      {topic.quiz.map((q, qi) => {
        const chosen = answers[qi];
        return (
          <fieldset key={qi} className="space-y-2">
            <legend className="mb-2 text-sm font-medium">
              Q{qi + 1}. {q.question}
            </legend>
            {q.choices.map((c, ci) => {
              const isAnswer = ci === q.answer;
              const isChosen = chosen === ci;
              return (
                <button
                  key={ci}
                  type="button"
                  disabled={chosen !== null}
                  onClick={() => choose(qi, ci)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                    chosen === null &&
                      'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800',
                    chosen !== null &&
                      isAnswer &&
                      'border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40',
                    chosen !== null &&
                      isChosen &&
                      !isAnswer &&
                      'border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40',
                    chosen !== null &&
                      !isAnswer &&
                      !isChosen &&
                      'border-slate-200 opacity-60 dark:border-slate-800',
                  )}
                >
                  {chosen !== null && isAnswer && (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  )}
                  {chosen !== null && isChosen && !isAnswer && (
                    <XCircle className="size-4 shrink-0 text-rose-600" />
                  )}
                  {c}
                </button>
              );
            })}
            {chosen !== null && q.explanation && (
              <p className="text-xs text-slate-600 dark:text-slate-400">{q.explanation}</p>
            )}
          </fieldset>
        );
      })}
      {done && (
        <p className="rounded-xl bg-accent-50 px-3 py-2 text-sm text-accent-900 dark:bg-accent-900/30 dark:text-accent-100">
          {correct}/{topic.quiz.length} 問正解。
          {saved && `次の復習は ${formatShortDate(saved)} ごろです。`}
        </p>
      )}
    </div>
  );
}

/** 考え方カードの 1 枚（本文・要点・やってみよう・クイズ・AI に質問） */
export default function TopicPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const topic = useLiveQuery(() => getTopic(id), [id]);
  const progress = useLiveQuery(() => db.progress.get(id), [id]);
  const [resetKey, setResetKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const custom = !BUILTIN_TOPICS.some((t) => t.id === id);

  useEffect(() => {
    if (topic) void markRead(topic.id);
  }, [topic]);

  if (topic === undefined) return <PageHeader title="学ぶ" back="/learn" />;
  if (topic === null) {
    return (
      <>
        <PageHeader title="学ぶ" back="/learn" />
        <PageBody>
          <p>カードが見つかりませんでした。</p>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={topic.title}
        back="/learn"
        actions={<ClearButton onClear={() => setResetKey((k) => k + 1)} />}
      />
      <PageBody>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
            {TOPIC_CATEGORIES[topic.category]}
          </span>
          {topic.recommendFor?.map((t) => (
            <span
              key={t}
              className="rounded-md bg-accent-50 px-1.5 py-0.5 text-accent-800 dark:bg-accent-900/30 dark:text-accent-200"
            >
              {tagLabel(t)}の人に
            </span>
          ))}
          {custom && (
            <span className="rounded-md bg-sky-50 px-1.5 py-0.5 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200">
              取り込んだカード
            </span>
          )}
        </div>
        <Card className="space-y-3 p-4 sm:p-5">
          <p className="font-medium">{topic.summary}</p>
          <div className="prose-chat">
            <Markdown text={topic.body} />
          </div>
        </Card>

        <Card className="space-y-2 p-4">
          <h2 className="flex items-center gap-1.5 font-semibold">
            <Lightbulb className="size-4 text-accent-600 dark:text-accent-400" />
            ポイント
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {topic.keyPoints.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
        </Card>

        <Card className="space-y-2 p-4">
          <h2 className="flex items-center gap-1.5 font-semibold">
            <Footprints className="size-4 text-accent-600 dark:text-accent-400" />
            やってみよう
          </h2>
          <p className="text-sm">{topic.practice}</p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() =>
                void markPracticed(topic.id).then(() =>
                  toast.success('記録しました。小さな一歩が大事です'),
                )
              }
            >
              やってみた
            </Button>
            {!!progress?.practiced && (
              <span className="text-xs text-slate-500">{progress.practiced} 回</span>
            )}
          </div>
        </Card>

        <Card className="space-y-3 p-4">
          <h2 className="font-semibold">確認クイズ</h2>
          <Quiz key={topic.id} topic={topic} onReset={resetKey} />
        </Card>

        <Card className="space-y-2 p-4">
          <h2 className="font-semibold">AI に質問する</h2>
          <TopicAsk topic={topic} />
        </Card>

        {custom && (
          <div className="flex justify-end">
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>
              <Trash2 />
              このカードを削除
            </Button>
          </div>
        )}
      </PageBody>
      <ConfirmDialog
        open={confirmDelete}
        title="このカードを削除しますか？"
        description="取り込んだカードと、その記録を削除します。"
        confirmLabel="削除"
        danger
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          void deleteCustomTopic(topic.id).then(() => navigate('/learn', { replace: true }));
        }}
      />
    </>
  );
}
