import { useState } from 'react';
import { ClipboardPaste, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { copyText } from '@/lib/utils/download';
import { errorMessage } from '@/lib/utils/format';
import { learnPackPrompt } from './externalPrompt';
import { importTopics, parseLearnPack } from './learnData';

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm dark:border-slate-700 dark:bg-slate-900';

/** 外部の AI で考え方カードを作る: プロンプトをコピー → 返ってきた JSON を貼り付けて取り込む */
export function LearnCreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [theme, setTheme] = useState('');
  const [count, setCount] = useState(3);
  const [json, setJson] = useState('');
  const [error, setError] = useState('');

  const doImport = async () => {
    try {
      const topics = parseLearnPack(json);
      await importTopics(topics);
      toast.success(`${topics.length} 個のカードを取り込みました`);
      setJson('');
      setError('');
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Dialog open={open} title="外部の AI でカードを作る" onClose={onClose}>
      <div className="space-y-4 text-sm">
        <section className="space-y-2">
          <h3 className="font-semibold">① プロンプトをコピー</h3>
          <input
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="テーマ（例: 雑談が苦手な人のための会話のコツ）"
            className={inputClass}
          />
          <div className="flex items-center gap-2">
            <label htmlFor="count">数</label>
            <select
              id="count"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
            >
              {[1, 3, 5, 8].map((n) => (
                <option key={n} value={n}>
                  {n} 個
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="primary"
              className="ml-auto"
              onClick={() =>
                void copyText(learnPackPrompt(theme, count)).then((ok) =>
                  ok
                    ? toast.success('コピーしました', {
                        description: 'ChatGPT・Claude・Gemini などに貼り付けてください',
                      })
                    : toast.error('コピーできませんでした'),
                )
              }
            >
              <Copy />
              コピー
            </Button>
          </div>
        </section>
        <section className="space-y-2">
          <h3 className="font-semibold">② 返ってきた JSON を貼り付けて取り込む</h3>
          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            rows={6}
            placeholder='{"format":"grow-learn-pack", ...}'
            className={`${inputClass} font-mono text-xs`}
          />
          {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="primary"
              disabled={!json.trim()}
              onClick={() => void doImport()}
            >
              <ClipboardPaste />
              確かめて取り込む
            </Button>
          </div>
        </section>
      </div>
    </Dialog>
  );
}
