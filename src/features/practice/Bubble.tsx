import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/** ロールプレイの吹き出し（相手は左、自分は右） */
export function Bubble({
  side,
  emoji,
  name,
  children,
  streaming,
}: {
  side: 'partner' | 'user';
  emoji?: string;
  name?: string;
  children: ReactNode;
  streaming?: boolean;
}) {
  if (side === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent-600 px-3.5 py-2 text-[0.95rem] text-white dark:bg-accent-700">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2.5">
      <div className="flex shrink-0 flex-col items-center gap-0.5">
        <span className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-lg dark:bg-slate-800">
          {emoji}
        </span>
        <span className="max-w-14 truncate text-[0.65rem] text-slate-500">{name}</span>
      </div>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl rounded-tl-md border border-slate-200 bg-white px-3.5 py-2 text-[0.95rem] dark:border-slate-800 dark:bg-slate-900',
          streaming && 'streaming-caret',
        )}
      >
        {children}
      </div>
    </div>
  );
}
