import { useEffect, useRef, useState } from 'react';
import { Copy, MessageCircleHeart, Sparkles, Square } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'wouter';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { copyText } from '@/lib/utils/download';
import { errorMessage } from '@/lib/utils/format';
import { aiReadyNow, useAiReady } from '@/features/cloud/aiClient';
import { useSettings } from '@/features/settings/settingsStore';
import { growTypeOf } from '@/features/assess/instruments/bigfiveTypes';
import type { AssessmentResult } from '@/features/assess/types';
import Markdown from '@/features/chat/markdown/Markdown';
import { cancelAi, runOneshot } from './oneshot';
import { fillLine, pick } from './personas';
import { useMainPersona } from './usePersona';
import { summarizeBigFive } from './appContext';
import { bigFiveDeepDivePrompt } from './externalPrompt';

/** 結果の画面の AI: キャラクターのひとこと・解説・チャットで掘り下げる・外部 AI 用のプロンプト */
export function ResultAiPanel({ result }: { result: AssessmentResult }) {
  const s = useSettings();
  const persona = useMainPersona();
  const ready = useAiReady();
  const type = growTypeOf(result.scores);
  const [reaction, setReaction] = useState(() =>
    fillLine(pick(persona.lines.result), { type: type.name }),
  );
  const [explain, setExplain] = useState('');
  const [busy, setBusy] = useState(false);
  const asked = useRef<string | null>(null);

  // ひとこと: AI が使えれば AI が考え、使えなければ決まったひとことのまま
  useEffect(() => {
    if (s.reaction !== 'llm' || asked.current === result.id || !aiReadyNow('reaction')) return;
    asked.current = result.id;
    let alive = true;
    void runOneshot({
      task: 'reaction',
      prompt: `<app_state>${JSON.stringify(summarizeBigFive(result))}</app_state>\nユーザーが性格診断を終えました。結果を見た最初のリアクションを、あなたのキャラクターらしく 1〜2 文で。解説はまだしないでください。`,
      maxOutputTokens: 120,
    })
      .then((r) => {
        if (alive && r.text && !r.cancelled) setReaction(r.text);
      })
      .catch(() => {
        // ひとことは決まった言葉のままでよい
      });
    return () => {
      alive = false;
    };
  }, [result, s.reaction]);

  const askExplain = async () => {
    setBusy(true);
    setExplain('');
    try {
      const r = await runOneshot({
        task: 'assist',
        prompt: `<app_state>${JSON.stringify(summarizeBigFive(result))}</app_state>\nこの性格診断の結果を、ユーザーにわかりやすく解説してください。①全体の傾向 ②強みが活きる場面 ③気をつけたい場面と小さな対策、の順に、具体的な場面の例を入れて 8 文程度で。数字は JSON のものだけを使ってください。`,
        maxOutputTokens: 900,
        onText: setExplain,
      });
      setExplain(r.text);
    } catch (e) {
      toast.error('解説を作れませんでした', { description: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-3 p-4">
      {s.reaction !== 'off' && (
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-50 text-xl dark:bg-accent-900/30">
            {persona.emoji}
          </span>
          <div className="min-w-0 rounded-2xl rounded-tl-md bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800">
            <div className="text-xs text-slate-500">{persona.name}</div>
            {reaction}
          </div>
        </div>
      )}
      {explain && (
        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <Markdown text={explain} />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {busy ? (
          <Button size="sm" onClick={() => cancelAi()}>
            <Square />
            止める
          </Button>
        ) : (
          <Button size="sm" variant="primary" disabled={!ready} onClick={() => void askExplain()}>
            <Sparkles />
            AI に解説してもらう
          </Button>
        )}
        <Link href="/chat">
          <Button size="sm">
            <MessageCircleHeart />
            チャットで掘り下げる
          </Button>
        </Link>
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            void copyText(bigFiveDeepDivePrompt(result)).then((ok) =>
              ok
                ? toast.success('プロンプトをコピーしました', {
                    description: 'ChatGPT・Claude・Gemini などに貼り付けて使えます',
                  })
                : toast.error('コピーできませんでした'),
            )
          }
        >
          <Copy />
          外部の AI 用にコピー
        </Button>
      </div>
      {!ready && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          AI を使うには「
          <Link href="/ai" className="text-accent-700 underline dark:text-accent-300">
            AI の設定
          </Link>
          」でクラウド AI のキーを登録するか、端末内のモデルを読み込んでください。外部の AI
          用のプロンプトは、AI がなくても使えます。
        </p>
      )}
    </Card>
  );
}
