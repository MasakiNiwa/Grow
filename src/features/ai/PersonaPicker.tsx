import { cn } from '@/lib/utils/cn';
import { PERSONAS } from './personas';

interface Option {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
}

const NONE: Option = { id: '', name: 'なし', emoji: '—', tagline: '相棒だけで話す' };

/** AI の性格を選ぶボタンの一覧（設定画面・はじめての案内で使う） */
export function PersonaPicker({
  value,
  onChange,
  custom,
  allowNone,
  exclude,
}: {
  value: string;
  onChange: (id: string) => void;
  /** カスタムのキャラクター（名前・絵文字は設定の値） */
  custom?: Option;
  /** 「なし」を選べるようにする（2 人目） */
  allowNone?: boolean;
  /** 選べないキャラクター（2 人目では相棒と同じものを除く） */
  exclude?: string;
}) {
  const options = [
    ...(allowNone ? [NONE] : []),
    ...PERSONAS.filter((p) => p.id !== exclude),
    ...(custom ? [custom] : []),
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((p) => (
        <button
          key={p.id}
          type="button"
          aria-pressed={value === p.id}
          onClick={() => onChange(p.id)}
          className={cn(
            'flex items-start gap-2 rounded-xl border p-2.5 text-left transition-colors sm:gap-3 sm:p-3',
            value === p.id
              ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20'
              : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50',
          )}
        >
          <span className="text-xl sm:text-2xl" aria-hidden>
            {p.emoji}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{p.name}</span>
            <span className="block text-xs text-slate-500 max-sm:line-clamp-2 dark:text-slate-400">
              {p.tagline}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
