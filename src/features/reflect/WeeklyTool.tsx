import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, Sparkles, Square } from 'lucide-react';
import { toast } from 'sonner';
import { EChart } from '@/components/charts/EChart';
import { useChartTheme } from '@/components/charts/useChartTheme';
import { Button } from '@/components/ui/Button';
import { weekStartOf, type WeeklyReport } from '@/lib/analysis/weekly';
import { cn } from '@/lib/utils/cn';
import { copyText } from '@/lib/utils/download';
import { errorMessage } from '@/lib/utils/format';
import { aiReadyNow, useAiReady } from '@/features/cloud/aiClient';
import { cancelAi, runOneshot } from '@/features/ai/oneshot';
import { buildBanterPrompt } from '@/features/ai/prompt';
import { getPersona } from '@/features/ai/personas';
import { MOOD_FACES } from '@/features/checkin/types';
import Markdown from '@/features/chat/markdown/Markdown';
import { PRACTICE_KIND_LABELS, type PracticeKind } from '@/features/practice/types';
import { useSettings } from '@/features/settings/settingsStore';
import { Stat } from './EmptyState';
import { loadWeeklyReport, reportMarkdown } from './weeklyData';

const WEEK = 7 * 86400000;
const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'];

function Change({ value, inverse }: { value: number | null; inverse?: boolean }) {
  if (value === null || value === 0) return null;
  const good = inverse ? value < 0 : value > 0;
  return (
    <span
      className={cn(
        'ml-1 text-xs',
        good ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
      )}
    >
      {value > 0 ? '+' : ''}
      {value}
    </span>
  );
}

/**
 * 週のレポート: 1 週間の記録をアプリが集計し、ハイライトを選ぶ。
 * キャラクター（相棒と 2 人目）がそれぞれの AI でコメントし、文章としてコピーもできる
 */
export default function WeeklyTool() {
  const theme = useChartTheme();
  const ready = useAiReady();
  const settings = useSettings();
  const [thisWeek] = useState(() => weekStartOf(Date.now()));
  // 週の前半は先週を最初に出す（ふりかえりやすいよう）
  const [week, setWeek] = useState(() =>
    new Date().getDay() >= 1 && new Date().getDay() <= 3
      ? weekStartOf(Date.now()) - WEEK
      : weekStartOf(Date.now()),
  );
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [comments, setComments] = useState<
    { name: string; emoji: string; text: string; model?: string }[]
  >([]);
  const [busy, setBusy] = useState(false);

  // 先週以前のレポートを開いたら「見た」ことにする（ホームの案内を消す）
  useEffect(() => {
    const s = useSettings.getState();
    if (week < thisWeek && week > s.weeklySeen) s.update({ weeklySeen: week });
  }, [week, thisWeek]);

  useEffect(() => {
    let alive = true;
    void loadWeeklyReport(week).then((r) => {
      if (!alive) return;
      setReport(r);
      setComments([]);
    });
    return () => {
      alive = false;
    };
  }, [week]);

  const option = useMemo(() => {
    if (!theme || !report) return null;
    return {
      color: [theme.series[0], theme.series[3]],
      grid: { left: 8, right: 8, top: 28, bottom: 8, containLabel: true },
      legend: { top: 0, textStyle: { color: theme.text } },
      tooltip: {
        trigger: 'axis',
        backgroundColor: theme.surface,
        borderColor: theme.grid,
        textStyle: { color: theme.text },
      },
      xAxis: { type: 'category', data: WEEKDAYS, axisLabel: { color: theme.muted } },
      yAxis: {
        type: 'value',
        min: 1,
        max: 5,
        interval: 1,
        axisLabel: { color: theme.muted },
        splitLine: { lineStyle: { color: theme.grid } },
      },
      series: [
        {
          name: '気分',
          type: 'line',
          smooth: true,
          connectNulls: true,
          symbolSize: 8,
          data: report.days.map((d) => d.mood),
        },
        {
          name: 'ストレス',
          type: 'line',
          smooth: true,
          connectNulls: true,
          lineStyle: { type: 'dashed' },
          data: report.days.map((d) => d.stress),
        },
      ],
    };
  }, [theme, report]);

  const ask = async () => {
    if (!report) return;
    setBusy(true);
    setComments([]);
    const main = getPersona(settings.persona, settings);
    const data = `<weekly_report>${JSON.stringify(report)}</weekly_report>`;
    try {
      let mainText = '';
      const r = await runOneshot({
        task: 'review',
        prompt: `${data}\nこれはアプリが集計した、ユーザーの 1 週間の記録です。数字はここにあるものだけを使ってください。今週をねぎらい、良かったことを 1 つ具体的に認め、来週の小さな一歩を 1 つ提案してください。あなたのキャラクターらしく 4〜6 文で。記録が少ない週でも責めないでください。`,
        maxOutputTokens: 600,
        onText: (t) => {
          mainText = t;
          setComments([{ name: main.name, emoji: main.emoji, text: t }]);
        },
      });
      mainText = r.text;
      setComments([{ name: main.name, emoji: main.emoji, text: r.text }]);
      // 2 人目がいれば、別の視点から一言（2 人目の AI で）
      if (
        !r.cancelled &&
        settings.secondPersona &&
        settings.secondPersona !== settings.persona &&
        aiReadyNow('aside')
      ) {
        const second = getPersona(settings.secondPersona, settings);
        const r2 = await runOneshot({
          task: 'aside',
          systemPrompt: buildBanterPrompt(settings, second, main, true),
          prompt: `${data}\n${main.name}: ${mainText}\n\nこの週のふりかえりに、あなたの視点から一言添えてください。`,
          maxOutputTokens: 200,
          onText: (t) =>
            setComments([
              { name: main.name, emoji: main.emoji, text: mainText },
              { name: second.name, emoji: second.emoji, text: t },
            ]),
        });
        setComments([
          { name: main.name, emoji: main.emoji, text: mainText },
          { name: second.name, emoji: second.emoji, text: r2.text },
        ]);
      }
    } catch (e) {
      toast.error('コメントを作れませんでした', { description: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  if (!report) return null;
  const isThisWeek = week === thisWeek;
  const practiceKinds = Object.keys(report.practice) as PracticeKind[];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="ghost"
          aria-label="前の週"
          onClick={() => setWeek(week - WEEK)}
        >
          <ChevronLeft />
        </Button>
        <div className="flex-1 text-center">
          <div className="font-semibold">
            {report.start.slice(5).replace('-', '/')} 〜 {report.end.slice(5).replace('-', '/')}
          </div>
          <div className="text-xs text-slate-500">
            {isThisWeek ? '今週（途中）' : week === thisWeek - WEEK ? '先週' : ''}
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          aria-label="次の週"
          disabled={isThisWeek}
          onClick={() => setWeek(week + WEEK)}
        >
          <ChevronRight />
        </Button>
      </div>

      {report.empty ? (
        <p className="py-6 text-center text-sm text-slate-500">この週の記録はありません。</p>
      ) : (
        <>
          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold">ハイライト</h3>
            <ul className="space-y-1 text-sm">
              {report.highlights.map((h) => (
                <li key={h} className="flex gap-2">
                  <span className="text-accent-600 dark:text-accent-400">●</span>
                  {h}
                </li>
              ))}
            </ul>
          </section>

          {report.condition.days > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">コンディション</h3>
              <div className="grid grid-cols-4 gap-2">
                <Stat label="気分" value={`${report.condition.mood ?? '-'}`} />
                <Stat label="エネルギー" value={`${report.condition.energy ?? '-'}`} />
                <Stat label="ストレス" value={`${report.condition.stress ?? '-'}`} />
                <Stat
                  label="睡眠"
                  value={report.condition.sleep !== null ? `${report.condition.sleep}h` : '-'}
                />
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs text-slate-500">
                <span>
                  先週比
                  <Change value={report.change.mood} />
                </span>
                <span>
                  先週比
                  <Change value={report.change.energy} />
                </span>
                <span>
                  先週比
                  <Change value={report.change.stress} inverse />
                </span>
                <span>
                  先週比
                  <Change value={report.change.sleep} />
                </span>
              </div>
              {option && (
                <EChart option={option} ariaLabel="今週の気分とストレス" className="h-48" />
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                {report.bestDay && (
                  <div className="rounded-xl bg-accent-50 p-3 text-sm dark:bg-accent-900/25">
                    <div className="text-xs text-slate-500">いちばん良かった日</div>
                    <div className="font-medium">
                      {MOOD_FACES[report.bestDay.mood - 1]}{' '}
                      {report.bestDay.date.slice(5).replace('-', '/')}
                      {report.bestDay.tags.length > 0 && (
                        <span className="ml-1 text-xs text-slate-500">
                          {report.bestDay.tags.join('・')}
                        </span>
                      )}
                    </div>
                    {report.bestDay.note && (
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {report.bestDay.note}
                      </p>
                    )}
                  </div>
                )}
                {report.hardDay && (
                  <div className="rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-800/60">
                    <div className="text-xs text-slate-500">しんどかった日</div>
                    <div className="font-medium">
                      {MOOD_FACES[report.hardDay.mood - 1]}{' '}
                      {report.hardDay.date.slice(5).replace('-', '/')}
                      {report.hardDay.tags.length > 0 && (
                        <span className="ml-1 text-xs text-slate-500">
                          {report.hardDay.tags.join('・')}
                        </span>
                      )}
                    </div>
                    {report.hardDay.note && (
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {report.hardDay.note}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="space-y-1 text-sm">
            <h3 className="font-semibold">学びと練習</h3>
            <p>
              練習：
              {practiceKinds.length
                ? practiceKinds
                    .map((k) => `${PRACTICE_KIND_LABELS[k]} ${report.practice[k]} 回`)
                    .join('・')
                : 'なし'}
              {report.roleplayAverage !== null && `（ロールプレイ平均 ${report.roleplayAverage}%）`}
            </p>
            <p>
              クイズ：{report.learning.quizzes} 回
              {report.learning.accuracy !== null && `（正答率 ${report.learning.accuracy}%）`}
              {report.learning.topics.length > 0 && `・${report.learning.topics.join('・')}`}
            </p>
          </section>
        </>
      )}

      {comments.length > 0 && (
        <section className="space-y-2">
          {comments.map((c, i) => (
            <div key={i} className={cn('flex gap-2.5', i > 0 && 'pl-6')}>
              <span className="text-xl">{c.emoji}</span>
              <div
                className={cn(
                  'min-w-0 flex-1 rounded-2xl rounded-tl-md border px-3 py-2 text-sm',
                  i > 0
                    ? 'border-dashed border-slate-300 dark:border-slate-700'
                    : 'border-slate-200 dark:border-slate-800',
                )}
              >
                <div className="text-xs text-slate-500">{c.name}</div>
                <Markdown text={c.text} />
              </div>
            </div>
          ))}
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        {busy ? (
          <Button size="sm" onClick={() => cancelAi()}>
            <Square />
            止める
          </Button>
        ) : (
          <Button
            size="sm"
            variant="primary"
            disabled={!ready || report.empty}
            onClick={() => void ask()}
          >
            <Sparkles />
            キャラクターにコメントしてもらう
          </Button>
        )}
        <Button
          size="sm"
          disabled={report.empty}
          onClick={() =>
            void copyText(reportMarkdown(report, comments)).then((ok) =>
              ok
                ? toast.success('レポートをコピーしました')
                : toast.error('コピーできませんでした'),
            )
          }
        >
          <Copy />
          文章でコピー
        </Button>
      </div>
    </div>
  );
}
