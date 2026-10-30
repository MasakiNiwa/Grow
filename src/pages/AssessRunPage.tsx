import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation, useParams } from 'wouter';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ClearButton } from '@/components/ui/ClearButton';
import { Progress } from '@/components/ui/Progress';
import { cn } from '@/lib/utils/cn';
import { errorMessage } from '@/lib/utils/format';
import { useSettings } from '@/features/settings/settingsStore';
import { getInstrument } from '@/features/assess/registry';
import { finishDraft, loadOrStartDraft, saveDraft, startDraft } from '@/features/assess/assessData';
import type { AssessmentDraft, Instrument, ItemDef } from '@/features/assess/types';

function OptionRow({
  inst,
  item,
  value,
  onAnswer,
  index,
}: {
  inst: Instrument;
  item: ItemDef;
  value: number | undefined;
  onAnswer: (v: number) => void;
  index: number;
}) {
  return (
    <fieldset className="space-y-2.5">
      <legend className="flex gap-2 text-[0.95rem] leading-relaxed font-medium">
        <span className="shrink-0 font-mono text-sm text-slate-400">{index}.</span>
        {item.text}
      </legend>
      <div className="grid grid-cols-5 gap-1.5">
        {inst.options.map((o) => {
          const selected = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onAnswer(o.value)}
              title={o.label}
              className={cn(
                'flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-1.5 text-center text-[0.65rem] leading-tight transition-colors sm:text-xs',
                selected
                  ? 'border-accent-500 bg-accent-50 font-semibold text-accent-800 dark:border-accent-500 dark:bg-accent-900/40 dark:text-accent-100'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800',
              )}
            >
              <span className="text-sm font-semibold">{o.value}</span>
              <span className="sm:hidden">{o.short}</span>
              <span className="max-sm:hidden">{o.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** 診断に答える画面（途中の回答は自動で保存し、続きから再開できる） */
export default function AssessRunPage() {
  const { id } = useParams<{ id: string }>();
  const inst = getInstrument(id);
  const [, navigate] = useLocation();
  const perPage = useSettings((s) => s.itemsPerPage);
  const autoAdvance = useSettings((s) => s.autoAdvance);
  const [draft, setDraft] = useState<AssessmentDraft | null>(null);
  const [page, setPage] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!inst) return;
    let alive = true;
    void loadOrStartDraft(inst).then((d) => {
      if (!alive) return;
      setDraft(d);
      // 最初の未回答のページから
      const first = d.order.findIndex((itemId) => d.answers[itemId] === undefined);
      setPage(first < 0 ? 0 : Math.floor(first / perPage));
    });
    return () => {
      alive = false;
    };
    // 1 ページの問題数を変えたときは、読み直さずにページだけ合わせる
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inst]);

  const itemsById = useMemo(() => new Map(inst?.items.map((i) => [i.id, i])), [inst]);

  if (!inst) {
    return (
      <>
        <PageHeader title="診断" back="/know" />
        <PageBody>
          <p>診断が見つかりませんでした。</p>
        </PageBody>
      </>
    );
  }

  const order = draft?.order ?? [];
  const pageCount = Math.max(1, Math.ceil(order.length / perPage));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = order.slice(safePage * perPage, safePage * perPage + perPage);
  const answered = draft ? Object.keys(draft.answers).length : 0;
  const pageDone = draft ? pageItems.every((i) => draft.answers[i] !== undefined) : false;
  const allDone = draft ? answered >= inst.items.length : false;

  const goPage = (p: number) => {
    setPage(p);
    topRef.current?.scrollIntoView({ block: 'start' });
  };

  const answer = (itemId: string, value: number) => {
    if (!draft) return;
    const next = { ...draft, answers: { ...draft.answers, [itemId]: value } };
    setDraft(next);
    void saveDraft(next);
    // 1 問ずつのときは、答えたら次へ
    if (perPage === 1 && autoAdvance && safePage < pageCount - 1) {
      setTimeout(() => goPage(safePage + 1), 180);
    }
  };

  const clear = async () => {
    const d = await startDraft(inst);
    setDraft(d);
    goPage(0);
    toast('回答をクリアしました');
  };

  const finish = async () => {
    if (!draft) return;
    setFinishing(true);
    try {
      const result = await finishDraft(inst, draft);
      navigate(`/know/result/${result.id}`, { replace: true });
    } catch (e) {
      toast.error('結果を保存できませんでした', { description: errorMessage(e) });
      setFinishing(false);
    }
  };

  return (
    <>
      <PageHeader
        title={inst.title}
        back="/know"
        actions={
          <ClearButton
            onClear={() => void clear()}
            disabled={answered === 0}
            confirm="この診断の回答をすべて消して、最初からやり直します。"
          />
        }
      />
      <div className="shrink-0 border-b border-slate-200 bg-slate-50/85 px-3 py-2 sm:px-4 dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex max-w-3xl items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <Progress value={answered / inst.items.length} className="flex-1" />
          <span className="shrink-0 font-mono">
            {answered}/{inst.items.length}
          </span>
        </div>
      </div>
      <PageBody>
        <div ref={topRef} />
        {safePage === 0 && answered === 0 && (
          <Card className="p-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {inst.intro}
          </Card>
        )}
        {draft && (
          <Card className="space-y-7 p-4 sm:p-5">
            {pageItems.map((itemId, i) => {
              const item = itemsById.get(itemId);
              if (!item) return null;
              return (
                <OptionRow
                  key={itemId}
                  inst={inst}
                  item={item}
                  index={safePage * perPage + i + 1}
                  value={draft.answers[itemId]}
                  onAnswer={(v) => answer(itemId, v)}
                />
              );
            })}
          </Card>
        )}
        <div className="flex items-center gap-2">
          <Button disabled={safePage === 0} onClick={() => goPage(safePage - 1)}>
            <ArrowLeft />
            前へ
          </Button>
          <span className="flex-1 text-center text-xs text-slate-500">
            {safePage + 1} / {pageCount}
          </span>
          {safePage < pageCount - 1 ? (
            <Button variant="primary" disabled={!pageDone} onClick={() => goPage(safePage + 1)}>
              次へ
              <ArrowRight />
            </Button>
          ) : (
            <Button
              variant="primary"
              disabled={!allDone || finishing}
              onClick={() => void finish()}
            >
              {finishing ? <Loader2 className="animate-spin" /> : <Check />}
              結果を見る
            </Button>
          )}
        </div>
        {safePage === pageCount - 1 && !allDone && draft && (
          <p className="text-center text-xs text-slate-500">
            未回答の設問が {inst.items.length - answered}{' '}
            問あります。前のページに戻って答えてください。
          </p>
        )}
      </PageBody>
    </>
  );
}
