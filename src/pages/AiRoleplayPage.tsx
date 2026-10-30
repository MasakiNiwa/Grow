import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Flag, Loader2, Square } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useParams } from 'wouter';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ClearButton } from '@/components/ui/ClearButton';
import { errorMessage } from '@/lib/utils/format';
import { getPersona } from '@/features/ai/personas';
import { cancelAi } from '@/features/ai/oneshot';
import { useAiReady } from '@/features/cloud/aiClient';
import { ModelStatusChip } from '@/features/engine/ModelStatusChip';
import { Bubble } from '@/features/practice/Bubble';
import { partnerReply, roleplayFeedback } from '@/features/practice/aiRoleplay';
import { getScenario, saveLog } from '@/features/practice/practiceData';
import type { AiRoleplayData, RoleplayFeedback, Scenario } from '@/features/practice/types';
import { useSettings } from '@/features/settings/settingsStore';

type Turn = { role: 'user' | 'partner'; text: string };

function Session({ scenario }: { scenario: Scenario }) {
  const persona = getPersona(
    useSettings((s) => s.persona),
    useSettings((s) => s.customPersona),
  );
  const ready = useAiReady();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [feedback, setFeedback] = useState<RoleplayFeedback | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const started = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);

  const reply = async (history: Turn[]) => {
    setStreaming('');
    try {
      const r = await partnerReply(scenario, history, setStreaming);
      if (r.text) setTurns([...history, { role: 'partner', text: r.text }]);
    } catch (e) {
      toast.error('相手役の返事を作れませんでした', { description: errorMessage(e) });
    } finally {
      setStreaming(null);
    }
  };

  useEffect(() => {
    if (started.current || !ready) return;
    started.current = true;
    void reply([]);
    // 最初の 1 回だけ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [turns, streaming, feedback]);

  const send = () => {
    if (!text.trim() || streaming !== null) return;
    const next = [...turns, { role: 'user' as const, text: text.trim() }];
    setTurns(next);
    setText('');
    void reply(next);
  };

  const finish = async () => {
    setReviewing(true);
    try {
      const r = await roleplayFeedback(scenario, turns);
      if (r.value) {
        setFeedback(r.value);
        await saveLog<{ id: string; kind: 'ai-roleplay'; createdAt: number; data: AiRoleplayData }>(
          {
            kind: 'ai-roleplay',
            data: { scenarioId: scenario.id, turns, feedback: r.value },
          },
        );
      } else if (!r.cancelled) {
        toast.error('ふりかえりを読み取れませんでした。もう一度お試しください');
      }
    } catch (e) {
      toast.error('ふりかえりを作れませんでした', { description: errorMessage(e) });
    } finally {
      setReviewing(false);
    }
  };

  if (!ready) {
    return (
      <Card className="p-4 text-sm">
        AI が使えません。
        <Link href="/ai" className="text-accent-700 underline dark:text-accent-300">
          AI の設定
        </Link>
        でクラウド AI のキーを登録するか、端末内のモデルを読み込んでください。
      </Card>
    );
  }

  const userTurns = turns.filter((t) => t.role === 'user').length;
  return (
    <div className="space-y-4">
      <Card className="p-4 text-sm text-slate-600 dark:text-slate-400">
        <strong className="text-slate-800 dark:text-slate-200">場面：</strong>
        {scenario.summary}。AI が{scenario.partner.name}（{scenario.partner.role}
        ）を演じます。自分の言葉で返してみましょう。何往復かしたら「終えてふりかえる」を押してください。
      </Card>
      {turns.map((t, i) =>
        t.role === 'partner' ? (
          <Bubble
            key={i}
            side="partner"
            emoji={scenario.partner.emoji}
            name={scenario.partner.name}
          >
            {t.text}
          </Bubble>
        ) : (
          <Bubble key={i} side="user">
            {t.text}
          </Bubble>
        ),
      )}
      {streaming !== null && (
        <Bubble
          side="partner"
          emoji={scenario.partner.emoji}
          name={scenario.partner.name}
          streaming
        >
          {streaming}
        </Bubble>
      )}

      {feedback ? (
        <Card className="space-y-3 p-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xl">{persona.emoji}</span>
            <span className="font-semibold">{persona.name}のふりかえり</span>
            {feedback.score !== undefined && (
              <span className="ml-auto text-xs text-slate-500">目安 {feedback.score} 点</span>
            )}
          </div>
          <div>
            <div className="mb-1 font-medium text-emerald-700 dark:text-emerald-300">
              良かったところ
            </div>
            <ul className="list-disc space-y-0.5 pl-5">
              {feedback.good.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </div>
          {feedback.improve.length > 0 && (
            <div>
              <div className="mb-1 font-medium text-amber-700 dark:text-amber-300">
                次に試すとよいこと
              </div>
              <ul className="list-disc space-y-0.5 pl-5">
                {feedback.improve.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
          )}
          {feedback.phrase && (
            <p className="rounded-xl bg-accent-50 px-3 py-2 dark:bg-accent-900/30">
              言い換えの例：「{feedback.phrase}」
            </p>
          )}
        </Card>
      ) : (
        <>
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              placeholder="あなたの返事"
              aria-label="あなたの返事"
              className="min-w-0 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            {streaming !== null ? (
              <Button size="icon" onClick={() => cancelAi()} aria-label="止める">
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
          </form>
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={userTurns === 0 || streaming !== null || reviewing}
              onClick={() => void finish()}
            >
              {reviewing ? <Loader2 className="animate-spin" /> : <Flag />}
              終えてふりかえる
            </Button>
          </div>
        </>
      )}
      <div ref={bottom} />
    </div>
  );
}

/** AI とロールプレイ: AI が相手役を演じ、終わったら構造化されたふりかえりを返す */
export default function AiRoleplayPage() {
  const { id } = useParams<{ id: string }>();
  const scenario = getScenario(id);
  const [key, setKey] = useState(0);
  if (!scenario) {
    return (
      <>
        <PageHeader title="練習" back="/practice" />
        <PageBody>
          <p>場面が見つかりませんでした。</p>
        </PageBody>
      </>
    );
  }
  return (
    <>
      <PageHeader
        title={`${scenario.title}（AI）`}
        back="/practice"
        actions={
          <ClearButton
            onClear={() => {
              cancelAi();
              setKey((k) => k + 1);
            }}
            confirm="この会話を消して、最初からやり直します。"
          />
        }
      />
      <div className="shrink-0 border-b border-slate-200 px-3 py-1.5 dark:border-slate-800">
        <div className="mx-auto flex max-w-3xl items-center gap-2 text-xs text-slate-500">
          使う AI
          <ModelStatusChip className="max-w-64" />
        </div>
      </div>
      <PageBody>
        <Session key={key} scenario={scenario} />
      </PageBody>
    </>
  );
}
