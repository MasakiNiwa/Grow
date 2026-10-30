import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowUp, Square, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';
import { getPersona } from '@/features/ai/personas';
import { useSettings } from '@/features/settings/settingsStore';
import Markdown from './markdown/Markdown';
import { useChat, type ChatMessage } from './chatStore';

function Avatar({ speaker }: { speaker?: string }) {
  const custom = useSettings((s) => s.customPersona);
  const p = getPersona(speaker ?? 'partner', custom);
  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5">
      <span className="flex size-9 items-center justify-center rounded-full bg-accent-50 text-lg dark:bg-accent-900/30">
        {p.emoji}
      </span>
      <span className="max-w-14 truncate text-[0.65rem] text-slate-500 dark:text-slate-400">
        {p.name}
      </span>
    </div>
  );
}

function Message({ m }: { m: ChatMessage }) {
  if (m.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent-600 px-3.5 py-2 text-[0.95rem] whitespace-pre-wrap text-white dark:bg-accent-700">
          {m.text}
        </div>
      </div>
    );
  }
  return (
    <div className={cn('flex gap-2.5', m.aside && 'pl-6')}>
      <Avatar speaker={m.speaker} />
      <div
        className={cn(
          'min-w-0 flex-1 rounded-2xl rounded-tl-md border px-3.5 py-2.5',
          m.aside
            ? 'border-dashed border-slate-300 bg-transparent dark:border-slate-700'
            : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
        )}
      >
        {m.tools && m.tools.length > 0 && (
          <div className="mb-1.5 flex items-center gap-1 text-xs text-slate-500">
            <Wrench className="size-3" />
            記録を調べて答えました
          </div>
        )}
        {m.text ? (
          <div className={cn(m.status === 'streaming' && 'streaming-caret')}>
            <Markdown text={m.text} />
          </div>
        ) : m.status === 'streaming' ? (
          <span className="streaming-caret text-sm text-slate-400" />
        ) : null}
        {m.status === 'error' && (
          <p className="mt-1 flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
            <AlertTriangle className="size-3.5" />
            {m.error}
          </p>
        )}
        {m.status === 'cancelled' && <p className="mt-1 text-xs text-slate-400">（止めました）</p>}
      </div>
    </div>
  );
}

const STARTERS = [
  '私の診断の結果を、やさしく解説して',
  '私の強みを、仕事や人間関係でどう活かせる？',
  '苦手になりやすい場面と、その乗り越え方を一緒に考えて',
  '前回の診断から変わったところはある？',
];

/** チャットの本体（メッセージの一覧と入力欄） */
export function ChatView() {
  const messages = useChat((s) => s.messages);
  const isGenerating = useChat((s) => s.isGenerating);
  const toolActivity = useChat((s) => s.toolActivity);
  const send = useChat((s) => s.send);
  const stop = useChat((s) => s.stop);
  const enterToSend = useSettings((s) => s.enterToSend);
  const persona = useSettings((s) => s.persona);
  const custom = useSettings((s) => s.customPersona);
  const [text, setText] = useState('');
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void useChat.getState().init();
  }, []);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const submit = (value = text) => {
    if (send(value)) setText('');
  };
  const p = getPersona(persona, custom);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl space-y-4 px-3 py-4 sm:px-4">
          {messages.length === 0 && (
            <div className="space-y-3 py-6 text-center">
              <div className="text-4xl">{p.emoji}</div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {p.name}：{p.tagline}
              </p>
              <div className="mx-auto flex max-w-md flex-col gap-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => submit(s)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:border-accent-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-accent-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <Message key={m.id} m={m} />
          ))}
          {toolActivity && <p className="text-xs text-slate-500">{toolActivity}</p>}
          <div ref={bottom} />
        </div>
      </div>
      <form
        className="shrink-0 border-t border-slate-200 bg-slate-50/90 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/90"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (enterToSend && e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder={`${p.name}に話しかける`}
            aria-label="メッセージ"
            className="max-h-40 min-h-11 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[0.95rem] dark:border-slate-700 dark:bg-slate-900"
          />
          {isGenerating ? (
            <Button size="icon" onClick={stop} aria-label="止める">
              <Square />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              variant="primary"
              disabled={!text.trim()}
              aria-label="送る"
            >
              <ArrowUp />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
