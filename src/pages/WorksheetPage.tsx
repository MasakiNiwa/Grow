import { useState, type ReactNode } from 'react';
import { BookOpen, Loader2, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useLocation, useParams } from 'wouter';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ClearButton } from '@/components/ui/ClearButton';
import { Slider } from '@/components/ui/Slider';
import { errorMessage } from '@/lib/utils/format';
import { pick } from '@/features/ai/personas';
import { useMainPersona } from '@/features/ai/usePersona';
import { runOneshot } from '@/features/ai/oneshot';
import { useAiReady } from '@/features/cloud/aiClient';
import Markdown from '@/features/chat/markdown/Markdown';
import { BUILTIN_TOPICS } from '@/features/learn/content/topics';
import { saveLog } from '@/features/practice/practiceData';
import { DISTORTIONS, WORKSHEETS, type WorksheetKind } from '@/features/practice/worksheets';
import type { PracticeLog } from '@/features/practice/types';

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900';

function Q({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium">{label}</div>
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      {children}
    </div>
  );
}

type Saver = (log: Omit<PracticeLog, 'id' | 'createdAt'>) => Promise<void>;

function ReframeForm({ onSave }: { onSave: Saver }) {
  const ready = useAiReady();
  const [event, setEvent] = useState('');
  const [thought, setThought] = useState('');
  const [feeling, setFeeling] = useState('');
  const [before, setBefore] = useState(70);
  const [distortions, setDistortions] = useState<string[]>([]);
  const [alternative, setAlternative] = useState('');
  const [after, setAfter] = useState(50);
  const [ideas, setIdeas] = useState('');
  const [thinking, setThinking] = useState(false);

  const askIdeas = async () => {
    setThinking(true);
    setIdeas('');
    try {
      const r = await runOneshot({
        task: 'assist',
        prompt: [
          'ユーザーが「考え方の整理（リフレーミング）」のワークシートを書いています。',
          JSON.stringify({
            出来事: event,
            浮かんだ考え: thought,
            気持ち: feeling,
            考え方のくせ: distortions,
          }),
          '別の見方を 3 つ、短い箇条書きで提案してください。無理に前向きにせず、「そういう見方もできる」程度の現実的なものにしてください。最後に、ユーザー自身の言葉で書いてみるよう一言添えてください。',
        ].join('\n'),
        maxOutputTokens: 400,
        onText: setIdeas,
      });
      setIdeas(r.text);
    } catch (e) {
      toast.error('提案を作れませんでした', { description: errorMessage(e) });
    } finally {
      setThinking(false);
    }
  };

  return (
    <Card className="space-y-5 p-4">
      <Q label="① どんな出来事があった？" hint="事実だけを、短く">
        <textarea
          value={event}
          onChange={(e) => setEvent(e.target.value)}
          rows={2}
          className={inputClass}
        />
      </Q>
      <Q label="② そのとき、どう考えた？" hint="頭に浮かんだ言葉をそのまま">
        <textarea
          value={thought}
          onChange={(e) => setThought(e.target.value)}
          rows={2}
          className={inputClass}
        />
      </Q>
      <Q label="③ どんな気持ちだった？ その強さは？">
        <input
          value={feeling}
          onChange={(e) => setFeeling(e.target.value)}
          placeholder="例: 不安、悔しい、恥ずかしい"
          className={inputClass}
        />
        <Slider value={before} min={0} max={100} step={5} onChange={setBefore} />
      </Q>
      <Q label="④ 考え方のくせに近いものは？（いくつでも）">
        <div className="flex flex-wrap gap-1.5">
          {DISTORTIONS.map((d) => (
            <Chip
              key={d}
              active={distortions.includes(d)}
              onClick={() =>
                setDistortions(
                  distortions.includes(d)
                    ? distortions.filter((x) => x !== d)
                    : [...distortions, d],
                )
              }
            >
              {d}
            </Chip>
          ))}
        </div>
      </Q>
      <Q label="⑤ 別の見方をすると？" hint="「友人が同じ状況なら、何と声をかける？」と考えてみる">
        <textarea
          value={alternative}
          onChange={(e) => setAlternative(e.target.value)}
          rows={3}
          className={inputClass}
        />
        {ready && (
          <Button size="sm" disabled={thinking || !event.trim()} onClick={() => void askIdeas()}>
            {thinking ? <Loader2 className="animate-spin" /> : <Sparkles />}
            AI と一緒に考える
          </Button>
        )}
        {ideas && (
          <div className="rounded-xl border border-dashed border-slate-300 p-3 text-sm dark:border-slate-700">
            <Markdown text={ideas} />
          </div>
        )}
      </Q>
      <Q label="⑥ いま、気持ちの強さは？">
        <Slider value={after} min={0} max={100} step={5} onChange={setAfter} />
      </Q>
      <div className="flex justify-end">
        <Button
          variant="primary"
          disabled={!event.trim() || !alternative.trim()}
          onClick={() =>
            void onSave({
              kind: 'reframe',
              data: { event, thought, feeling, before, distortions, alternative, after },
            })
          }
        >
          <Save />
          記録する
        </Button>
      </div>
    </Card>
  );
}

function GoodThingsForm({ onSave }: { onSave: Saver }) {
  const [items, setItems] = useState(['', '', '']);
  return (
    <Card className="space-y-4 p-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        小さなことで大丈夫です（「コーヒーがおいしかった」「電車で座れた」など）。続けると、よいことに気づきやすくなります。
      </p>
      {items.map((v, i) => (
        <Q key={i} label={`よいこと ${i + 1}`}>
          <input
            value={v}
            onChange={(e) => setItems(items.map((x, j) => (j === i ? e.target.value : x)))}
            className={inputClass}
          />
        </Q>
      ))}
      <div className="flex justify-end">
        <Button
          variant="primary"
          disabled={items.every((x) => !x.trim())}
          onClick={() =>
            void onSave({ kind: 'good-things', data: { items: items.map((x) => x.trim()) } })
          }
        >
          <Save />
          記録する
        </Button>
      </div>
    </Card>
  );
}

function IfThenForm({ onSave }: { onSave: Saver }) {
  const [trigger, setTrigger] = useState('');
  const [action, setAction] = useState('');
  return (
    <Card className="space-y-4 p-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        すでに毎日している行動（きっかけ）に、とても小さな行動を結びつけます。
      </p>
      <Q label="きっかけ（〜したら）" hint="例: 朝、歯をみがいたら">
        <input
          value={trigger}
          onChange={(e) => setTrigger(e.target.value)}
          className={inputClass}
        />
      </Q>
      <Q label="小さな行動（〜する）" hint="例: 今日いちばん大事なことを 1 つメモする">
        <input value={action} onChange={(e) => setAction(e.target.value)} className={inputClass} />
      </Q>
      {trigger && action && (
        <p className="rounded-xl bg-accent-50 px-3 py-2 text-sm dark:bg-accent-900/30">
          「{trigger}、{action}」
        </p>
      )}
      <div className="flex justify-end">
        <Button
          variant="primary"
          disabled={!trigger.trim() || !action.trim()}
          onClick={() =>
            void onSave({
              kind: 'if-then',
              data: { trigger: trigger.trim(), action: action.trim() },
            })
          }
        >
          <Save />
          記録する
        </Button>
      </div>
    </Card>
  );
}

const SAVED_LINES = ['記録したよ。小さな一歩が大事！', '書けたこと自体がえらい！'];

/** 改善トレーニング（ワークシート） */
export default function WorksheetPage() {
  const { kind } = useParams<{ kind: WorksheetKind }>();
  const [, navigate] = useLocation();
  const sheet = WORKSHEETS.find((w) => w.kind === kind);
  const persona = useMainPersona();
  const [formKey, setFormKey] = useState(0);
  if (!sheet) {
    return (
      <>
        <PageHeader title="練習" back="/practice" />
        <PageBody>
          <p>ワークシートが見つかりませんでした。</p>
        </PageBody>
      </>
    );
  }

  const onSave: Saver = async (log) => {
    try {
      await saveLog(log as PracticeLog);
      toast.success(`${persona.emoji} ${pick(SAVED_LINES)}`);
      navigate('/practice');
    } catch (e) {
      toast.error('記録できませんでした', { description: errorMessage(e) });
    }
  };

  const Form = { reframe: ReframeForm, 'good-things': GoodThingsForm, 'if-then': IfThenForm }[
    sheet.kind
  ];
  return (
    <>
      <PageHeader
        title={sheet.title}
        back="/practice"
        actions={<ClearButton onClear={() => setFormKey((k) => k + 1)} />}
      />
      <PageBody>
        <Form key={formKey} onSave={onSave} />
        <div className="flex flex-wrap gap-2">
          {sheet.topicIds.map((id) => {
            const t = BUILTIN_TOPICS.find((x) => x.id === id);
            return t ? (
              <Link key={id} href={`/learn/${id}`}>
                <Button size="sm" variant="ghost">
                  <BookOpen />
                  {t.title}
                </Button>
              </Link>
            ) : null;
          })}
        </div>
      </PageBody>
    </>
  );
}
