import { useEffect, useRef, useState } from 'react';
import { BookOpen, CheckCircle2, CircleDot, XCircle } from 'lucide-react';
import { Link, useParams } from 'wouter';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ClearButton } from '@/components/ui/ClearButton';
import { cn } from '@/lib/utils/cn';
import { useMainPersona } from '@/features/ai/usePersona';
import { BUILTIN_TOPICS } from '@/features/learn/content/topics';
import { Bubble } from '@/features/practice/Bubble';
import { getScenario, maxScore, saveLog } from '@/features/practice/practiceData';
import type { RoleplayData, Scenario } from '@/features/practice/types';

type Step = { node: string; choice: number; score: number };

const SCORE_ICON = [XCircle, CircleDot, CheckCircle2];
const SCORE_COLOR = ['text-rose-500', 'text-amber-500', 'text-emerald-500'];

function finalComment(ratio: number): string {
  if (ratio >= 0.85) return '相手も自分も大切にした伝え方ができました！';
  if (ratio >= 0.5)
    return 'いいところがたくさんありました。惜しかったところを、もう一度試してみましょう。';
  return '難しい場面でしたね。解説を読んで、もう一度挑戦してみましょう。';
}

function Run({ scenario }: { scenario: Scenario }) {
  const persona = useMainPersona();
  const [steps, setSteps] = useState<Step[]>([]);
  const bottom = useRef<HTMLDivElement>(null);

  const last = steps.at(-1);
  const currentId = last ? scenario.nodes[last.node].choices![last.choice].next : scenario.start;
  const current = scenario.nodes[currentId];
  const ended = !!current?.end;
  const score = steps.reduce((a, s) => a + s.score, 0);
  const max = maxScore(scenario);

  const choose = (ci: number) => {
    const c = current.choices![ci];
    const next = [...steps, { node: currentId, choice: ci, score: c.score }];
    setSteps(next);
    // 終わりの場面に着いたら記録する
    if (scenario.nodes[c.next]?.end) {
      void saveLog<{ id: string; kind: 'roleplay'; createdAt: number; data: RoleplayData }>({
        kind: 'roleplay',
        data: {
          scenarioId: scenario.id,
          steps: next,
          score: next.reduce((a, s) => a + s.score, 0),
          maxScore: max,
        },
      });
    }
  };

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [steps]);

  return (
    <div className="space-y-4">
      <Card className="p-4 text-sm text-slate-600 dark:text-slate-400">
        <strong className="text-slate-800 dark:text-slate-200">場面：</strong>
        {scenario.summary}。相手は{scenario.partner.name}（{scenario.partner.role}
        ）です。いちばん良いと思う伝え方を選んでください。
      </Card>

      {steps.map((st, i) => {
        const node = scenario.nodes[st.node];
        const choice = node.choices![st.choice];
        const Icon = SCORE_ICON[choice.score];
        return (
          <div key={i} className="space-y-3">
            <Bubble side="partner" emoji={scenario.partner.emoji} name={scenario.partner.name}>
              {node.line}
            </Bubble>
            <Bubble side="user">{choice.text}</Bubble>
            <div className="flex gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800/70">
              <Icon className={cn('mt-0.5 size-4 shrink-0', SCORE_COLOR[choice.score])} />
              <span>{choice.feedback}</span>
            </div>
          </div>
        );
      })}

      {current && (
        <Bubble side="partner" emoji={scenario.partner.emoji} name={scenario.partner.name}>
          {current.line}
        </Bubble>
      )}

      {current && !ended && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-slate-500">あなたの返事</div>
          {current.choices!.map((c, ci) => (
            <button
              key={ci}
              type="button"
              onClick={() => choose(ci)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm hover:border-accent-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-accent-700"
            >
              {c.text}
            </button>
          ))}
        </div>
      )}

      {ended && (
        <Card className="space-y-3 p-4">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {score}/{max}
            </span>
            <span className="text-sm text-slate-500">点</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <span className="text-xl">{persona.emoji}</span>
            <p>{finalComment(max ? score / max : 0)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {scenario.topicIds.map((id) => {
              const t = BUILTIN_TOPICS.find((x) => x.id === id);
              return t ? (
                <Link key={id} href={`/learn/${id}`}>
                  <Button size="sm">
                    <BookOpen />
                    {t.title}
                  </Button>
                </Link>
              ) : null;
            })}
          </div>
        </Card>
      )}
      <div ref={bottom} />
    </div>
  );
}

/** 場面ロールプレイ（選択式）。AI がなくても練習できる */
export default function ScenarioPage() {
  const { id } = useParams<{ id: string }>();
  const scenario = getScenario(id);
  const [runKey, setRunKey] = useState(0);
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
        title={scenario.title}
        back="/practice"
        actions={<ClearButton onClear={() => setRunKey((k) => k + 1)} />}
      />
      <PageBody>
        <Run key={runKey} scenario={scenario} />
      </PageBody>
    </>
  );
}
