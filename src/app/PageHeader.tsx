import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils/cn';
import { CHAT_ITEM, HELP_ITEM } from './navItems';
import { ThemeToggle } from './ThemeToggle';

interface PageHeaderProps {
  title: string;
  /** 戻り先（あれば左に戻るボタンを出す） */
  back?: string;
  /** 右側のアクション（ダークモード・ヘルプの左に並ぶ） */
  actions?: ReactNode;
}

/** ヘッダー右端のヘルプ（ヘルプページでは出さない） */
function HelpLink() {
  const [location] = useLocation();
  if (location === HELP_ITEM.to) return null;
  return (
    <Link
      href={HELP_ITEM.to}
      aria-label={HELP_ITEM.label}
      title={HELP_ITEM.label}
      className="flex size-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <HELP_ITEM.icon className="size-5" />
    </Link>
  );
}

/** スマホ用: AI と話す（PC はサイドバーにある。チャット画面では出さない） */
function ChatLink() {
  const [location] = useLocation();
  if (location === CHAT_ITEM.to) return null;
  return (
    <Link
      href={CHAT_ITEM.to}
      aria-label={CHAT_ITEM.label}
      title={CHAT_ITEM.label}
      className="flex size-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-200/70 md:hidden dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <CHAT_ITEM.icon className="size-5" />
    </Link>
  );
}

/**
 * ページのヘッダー。右端には、どのページでも「ダークモードの切り替え」と「ヘルプ」を置く。
 * （GitHub へのリンクはヘッダーに置かない方針。リポジトリへのリンクはヘルプページにある）
 */
export function PageHeader({ title, back, actions }: PageHeaderProps) {
  return (
    <header className="pt-safe sticky top-0 z-20 shrink-0 border-b border-slate-200 bg-slate-50/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/85">
      <div className="flex h-14 items-center gap-1.5 px-2 sm:px-4">
        {back ? (
          <Link
            href={back}
            aria-label="戻る"
            className="flex size-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="size-5" />
          </Link>
        ) : (
          <img src="./favicon.svg" alt="" className="mx-1 size-7 md:hidden" />
        )}
        <h1 className={cn('min-w-0 truncate text-base font-semibold sm:text-lg')}>{title}</h1>
        <div className="ml-auto flex items-center gap-0.5">
          {actions}
          <ChatLink />
          <ThemeToggle />
          <HelpLink />
        </div>
      </div>
    </header>
  );
}

/** スクロール可能なページ本体 */
export function PageBody({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div
        className={cn(
          'mx-auto w-full space-y-4 px-3 py-4 sm:px-4 sm:py-6',
          wide ? 'max-w-5xl' : 'max-w-3xl',
        )}
      >
        {children}
      </div>
    </div>
  );
}
