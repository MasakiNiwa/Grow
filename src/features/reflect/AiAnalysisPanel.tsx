import { useState } from 'react';
import { Copy, Download, Sparkles, Square } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { db } from '@/lib/db/db';
import { copyText, downloadText } from '@/lib/utils/download';
import { errorMessage } from '@/lib/utils/format';
import { useAiReady } from '@/features/cloud/aiClient';
import { cancelAi, runOneshot } from '@/features/ai/oneshot';
import { useMainPersona } from '@/features/ai/usePersona';
import Markdown from '@/features/chat/markdown/Markdown';
import { toCsv } from './csv';
import { buildAnalysisOverview, overviewPrompt } from './overview';

/**
 * ふりかえるの下: AI に分析してもらう・外部の AI 用にコピー・データを書き出す。
 * どれもアプリが集計したまとめ（JSON）をもとにする
 */
export function AiAnalysisPanel() {
  const ready = useAiReady();
  const persona = useMainPersona();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const ask = async () => {
    setBusy(true);
    setText('');
    try {
      const o = await buildAnalysisOverview();
      const r = await runOneshot({
        task: 'review',
        prompt: [
          `<analysis>${JSON.stringify(o)}</analysis>`,
          'これはアプリが集計した、ユーザーの記録のまとめです。数字はここにあるものだけを使ってください。',
          '①最近の調子の傾向 ②気づいたこと（相関は因果ではないことに注意）③来週試せる小さな一歩、を合わせて 6〜8 文で、あなたのキャラクターらしく伝えてください。データが少ないところは無理に結論を出さないでください。',
        ].join('\n'),
        maxOutputTokens: 900,
        onText: setText,
      });
      setText(r.text);
    } catch (e) {
      toast.error('分析できませんでした', { description: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  const copyPrompt = async () => {
    const ok = await copyText(overviewPrompt(await buildAnalysisOverview()));
    if (ok)
      toast.success('コピーしました', {
        description: 'ChatGPT・Claude・Gemini などに貼り付けてください',
      });
    else toast.error('コピーできませんでした');
  };

  const exportCsv = async () => {
    const date = new Date().toISOString().slice(0, 10);
    const checkins = await db.checkins.orderBy('createdAt').toArray();
    downloadText(
      `grow-checkins-${date}.csv`,
      toCsv(
        ['date', 'time', 'mood', 'energy', 'stress', 'sleep', 'tags', 'note'],
        checkins.map((c) => [
          c.date,
          new Date(c.createdAt).toTimeString().slice(0, 5),
          c.mood,
          c.energy,
          c.stress,
          c.sleep ?? '',
          c.tags.join('|'),
          c.note ?? '',
        ]),
      ),
      'text/csv',
    );
    downloadText(
      `grow-analysis-${date}.json`,
      JSON.stringify(await buildAnalysisOverview(), null, 2),
      'application/json',
    );
  };

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">{persona.emoji}</span>
        <h2 className="font-semibold">まとめて分析</h2>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        性格・コンディション・学び・練習の記録を、アプリが集計してまとめます。そのまとめをもとに、AI
        がコメントします。
      </p>
      {text && (
        <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
          <Markdown text={text} />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {busy ? (
          <Button size="sm" onClick={() => cancelAi()}>
            <Square />
            止める
          </Button>
        ) : (
          <Button size="sm" variant="primary" disabled={!ready} onClick={() => void ask()}>
            <Sparkles />
            {persona.name}に分析してもらう
          </Button>
        )}
        <Button size="sm" onClick={() => void copyPrompt()}>
          <Copy />
          外部の AI 用にコピー
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void exportCsv()}>
          <Download />
          CSV・JSON で書き出す
        </Button>
      </div>
      {!ready && (
        <p className="text-xs text-slate-500">
          AI を設定すると、キャラクターが分析してくれます。外部の AI 用のプロンプトと書き出しは、AI
          がなくても使えます。
        </p>
      )}
    </Card>
  );
}
