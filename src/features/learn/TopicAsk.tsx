import { useState } from 'react';
import { MessageCircleQuestion, Square } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { errorMessage } from '@/lib/utils/format';
import { useAiReady } from '@/features/cloud/aiClient';
import { cancelAi, runOneshot } from '@/features/ai/oneshot';
import { buildAppState, formatAppState } from '@/features/ai/appContext';
import Markdown from '@/features/chat/markdown/Markdown';
import { useSettings } from '@/features/settings/settingsStore';
import type { Topic } from './types';

const SUGGESTIONS = [
  '私の場合だと、どんな場面で使える？',
  'もっと具体的な例を教えて',
  'うまくできないときはどうする？',
];

/** トピックについて AI に質問する（トピックの内容とアプリの状態を添える） */
export function TopicAsk({ topic }: { topic: Topic }) {
  const ready = useAiReady();
  const share = useSettings((s) => s.shareAppState);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);

  const ask = async (q: string) => {
    if (!q.trim()) return;
    setBusy(true);
    setAnswer('');
    try {
      const state = share ? formatAppState(await buildAppState(`learn:${topic.id}`)) : '';
      const r = await runOneshot({
        task: 'assist',
        prompt: [
          state,
          `<topic>${JSON.stringify({ title: topic.title, summary: topic.summary, keyPoints: topic.keyPoints, practice: topic.practice })}</topic>`,
          `ユーザーは上の「考え方カード」を読んでいます。次の質問に、カードの内容をふまえて、具体例を交えて答えてください。`,
          `質問: ${q.trim()}`,
        ]
          .filter(Boolean)
          .join('\n'),
        maxOutputTokens: 700,
        onText: setAnswer,
      });
      setAnswer(r.text);
    } catch (e) {
      toast.error('答えを作れませんでした', { description: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <p className="text-xs text-slate-500 dark:text-slate-400">
        AI を設定すると、このカードについて質問できます（設定 → AI の接続先とモデル）。
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy}
            onClick={() => {
              setQuestion(s);
              void ask(s);
            }}
            className="rounded-full border border-slate-200 px-2.5 py-1 text-xs hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            {s}
          </button>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(question);
        }}
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="このカードについて質問する"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        {busy ? (
          <Button onClick={() => cancelAi()} aria-label="止める">
            <Square />
          </Button>
        ) : (
          <Button type="submit" variant="primary" disabled={!question.trim()}>
            <MessageCircleQuestion />
            聞く
          </Button>
        )}
      </form>
      {answer && (
        <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
          <Markdown text={answer} />
        </div>
      )}
    </div>
  );
}
