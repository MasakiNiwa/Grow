import { Compass } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/Button';

export function EmptyResults({ need = 1 }: { need?: number }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
      <Compass className="size-8 text-slate-400" />
      {need > 1
        ? `この分析には、診断の結果が ${need} つ以上必要です。`
        : 'まだ診断の結果がありません。'}
      <Link href="/know">
        <Button variant="primary" size="sm">
          診断を受ける
        </Button>
      </Link>
    </div>
  );
}
