import { useState } from 'react';
import { Eraser } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { ConfirmDialog } from './ConfirmDialog';

interface ClearButtonProps {
  onClear: () => void;
  /** 確認のダイアログを出す（消すものが多いとき）。文字列はその説明 */
  confirm?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * 「クリア」ボタン: 今の画面の入力や進行中の内容をリセットする（アプリのデータ全体は消さない）。
 * ページのヘッダー右側（ダークモード・ヘルプの左）に置く。
 */
export function ClearButton({ onClear, confirm, disabled, className }: ClearButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => (confirm ? setOpen(true) : onClear())}
        aria-label="クリア"
        title="クリア（この画面の入力をリセット）"
        className={cn(
          'flex h-10 items-center gap-1 rounded-xl px-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200/70 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800',
          className,
        )}
      >
        <Eraser className="size-5" />
        <span className="max-sm:sr-only">クリア</span>
      </button>
      {confirm && (
        <ConfirmDialog
          open={open}
          title="クリアしますか？"
          description={confirm}
          confirmLabel="クリア"
          danger
          onConfirm={() => {
            setOpen(false);
            onClear();
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
