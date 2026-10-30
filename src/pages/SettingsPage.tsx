import { useEffect, useRef, useState } from 'react';
import {
  Bot,
  ChevronRight,
  ClipboardList,
  Cpu,
  Database,
  Palette,
  RotateCcw,
  Users,
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Section } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/lib/utils/cn';
import { downloadText } from '@/lib/utils/download';
import { errorMessage, formatBytes, formatDateTime } from '@/lib/utils/format';
import {
  clearAllData,
  exportBackup,
  parseBackup,
  restoreBackup,
  type Backup,
} from '@/lib/db/backup';
import { CharacterSettings } from '@/features/ai/CharacterSettings';
import { useChat } from '@/features/chat/chatStore';
import { ModelStatusChip } from '@/features/engine/ModelStatusChip';
import {
  BACKEND_SETTING_LABELS,
  REACTION_LABELS,
  USER_AGE_LABELS,
  USER_GENDER_LABELS,
} from '@/features/settings/labels';
import {
  portableSettings,
  sanitizeSettings,
  useSettings,
  type BackendSetting,
  type DarkPalette,
  type ReactionMode,
  type UserAge,
  type UserGender,
  type ItemsPerPage,
  type ThemeSetting,
} from '@/features/settings/settingsStore';

const textareaClass =
  'w-full rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900';

const CONTEXT_OPTIONS = [2048, 4096, 8192, 16384, 32768].map((n) => ({
  value: String(n),
  label: `${n.toLocaleString()} トークン`,
}));

function options<T extends string>(labels: Record<T, string>) {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}

const THEME_OPTIONS: { value: ThemeSetting; label: string }[] = [
  { value: 'system', label: '端末に合わせる' },
  { value: 'light', label: 'ライト' },
  { value: 'dark', label: 'ダーク' },
];

const PALETTES: Record<DarkPalette, { label: string; hint: string; colors: string[] }> = {
  neutral: {
    label: '静かなグレー',
    hint: '色味のないグレーと、くすんだセージ',
    colors: ['#1f1f1f', '#303030', '#6f8f80'],
  },
  warm: {
    label: 'あたたかいグレー',
    hint: '少し暖かいグレーと、くすんだテラコッタ',
    colors: ['#201f1d', '#33312e', '#b07a5e'],
  },
};

function StorageUsage() {
  const [text, setText] = useState('…');
  useEffect(() => {
    void navigator.storage
      ?.estimate?.()
      .then((e) => setText(`${formatBytes(e.usage)} / ${formatBytes(e.quota)}`))
      .catch(() => setText('-'));
  }, []);
  return <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{text}</span>;
}

type ConfirmKind = 'restore' | 'all' | 'reset' | null;

export default function SettingsPage() {
  const s = useSettings();
  const update = s.update;
  const restoreInput = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [pendingRestore, setPendingRestore] = useState<Backup | null>(null);

  const backup = async () => {
    try {
      const data = await exportBackup(portableSettings(useSettings.getState()));
      const date = new Date().toISOString().slice(0, 10);
      downloadText(`grow-backup-${date}.json`, JSON.stringify(data, null, 2), 'application/json');
      update({ lastBackupAt: Date.now() });
      toast.success('バックアップを書き出しました');
    } catch (e) {
      toast.error('書き出せませんでした', { description: errorMessage(e) });
    }
  };

  return (
    <>
      <PageHeader title="設定" />
      <PageBody>
        <Section collapsible title="表示" icon={<Palette />}>
          <Field label="テーマ" htmlFor="theme">
            <Select
              id="theme"
              value={s.theme}
              onChange={(v) => update({ theme: v })}
              options={THEME_OPTIONS}
              className="w-40"
            />
          </Field>
          <Field
            label="ダークモードの配色"
            hint="どちらも彩度を抑え、長く見ていても疲れにくい配色です"
            stacked
          >
            <div
              className="grid gap-2 sm:grid-cols-2"
              role="radiogroup"
              aria-label="ダークモードの配色"
            >
              {(Object.keys(PALETTES) as DarkPalette[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={s.darkPalette === k}
                  onClick={() => update({ darkPalette: k })}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors',
                    s.darkPalette === k
                      ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/30'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800',
                  )}
                >
                  <span className="flex shrink-0 overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600">
                    {PALETTES[k].colors.map((c) => (
                      <span key={c} className="h-8 w-4" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{PALETTES[k].label}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {PALETTES[k].hint}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </Field>
          <Field label="文字を大きくする" htmlFor="large-text">
            <Switch
              id="large-text"
              checked={s.largeText}
              onChange={(v) => update({ largeText: v })}
            />
          </Field>
          <Field
            label="動きを減らす"
            htmlFor="reduce-motion"
            hint="画面の切り替えなどのアニメーションを控えます"
          >
            <Switch
              id="reduce-motion"
              checked={s.reduceMotion}
              onChange={(v) => update({ reduceMotion: v })}
            />
          </Field>
        </Section>

        <Section
          collapsible
          title="AI の接続先とモデル"
          icon={<Bot />}
          description="クラウド AI の API キー・端末内のモデル・場面ごとの AI"
        >
          <Link
            href="/ai"
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 sm:px-5 dark:hover:bg-slate-800/40"
          >
            <span className="flex-1 text-sm font-medium">AI の設定を開く</span>
            <ModelStatusChip plain className="max-w-48" />
            <ChevronRight className="size-4 text-slate-400" />
          </Link>
        </Section>

        <Section
          collapsible
          title="AI のキャラクター"
          icon={<Users />}
          description="相棒と、別の視点から一言添える 2 人目を選べます"
        >
          <CharacterSettings />
          <Field label="あなたの性別" htmlFor="user-gender" hint="任意。話題や例の参考にします">
            <Select
              id="user-gender"
              value={s.userGender}
              onChange={(v) => update({ userGender: v as UserGender })}
              options={options(USER_GENDER_LABELS)}
              className="w-36"
            />
          </Field>
          <Field label="あなたの年齢層" htmlFor="user-age" hint="任意">
            <Select
              id="user-age"
              value={s.userAge}
              onChange={(v) => update({ userAge: v as UserAge })}
              options={options(USER_AGE_LABELS)}
              className="w-36"
            />
          </Field>
          <Field label="AI への追加の指示" hint="すべての応答に付け加えます" stacked>
            <textarea
              value={s.extraInstructions}
              onChange={(e) => update({ extraInstructions: e.target.value })}
              rows={2}
              placeholder="例: 具体的な職場の例で説明してほしい"
              className={textareaClass}
            />
          </Field>
        </Section>

        <Section collapsible title="AI のふるまい" icon={<Bot />}>
          <Field label="ひとこと" htmlFor="reaction" hint="診断を終えたときなどのリアクション">
            <Select
              id="reaction"
              value={s.reaction}
              onChange={(v) => update({ reaction: v as ReactionMode })}
              options={options(REACTION_LABELS)}
              className="w-44"
            />
          </Field>
          <Field
            label="アプリの状態を AI に伝える"
            htmlFor="share-state"
            hint="最新の診断の結果の要約（タイプ・5 特性の得点など）を、構造化データとして会話に添えます"
          >
            <Switch
              id="share-state"
              checked={s.shareAppState}
              onChange={(v) => update({ shareAppState: v })}
            />
          </Field>
          <Field
            label="AI に記録を調べさせる"
            htmlFor="use-tools"
            hint="AI がツール（関数呼び出し）で診断の記録や側面の得点を調べてから答えます"
          >
            <Switch id="use-tools" checked={s.useTools} onChange={(v) => update({ useTools: v })} />
          </Field>
          <Field
            label="Enter で送信"
            htmlFor="enter-send"
            hint="オフのときは Shift なしの Enter で改行します"
          >
            <Switch
              id="enter-send"
              checked={s.enterToSend}
              onChange={(v) => update({ enterToSend: v })}
            />
          </Field>
        </Section>

        <Section
          collapsible
          title="端末内の AI（エンジン）"
          icon={<Cpu />}
          description="変更後はモデルの読み込み直しが必要です"
        >
          <Field label="実行方法" htmlFor="backend">
            <Select
              id="backend"
              value={s.backend}
              onChange={(v) => update({ backend: v as BackendSetting })}
              options={options(BACKEND_SETTING_LABELS)}
              className="w-40"
            />
          </Field>
          <Field
            label="文脈長"
            htmlFor="context"
            hint="長いほど長い会話を覚えますが、メモリを使います"
          >
            <Select
              id="context"
              value={String(s.maxNumTokens)}
              onChange={(v) => update({ maxNumTokens: Number(v) })}
              options={CONTEXT_OPTIONS}
              className="w-40"
            />
          </Field>
          <Field label="起動時に前回のモデルを読み込む" htmlFor="auto-load">
            <Switch
              id="auto-load"
              checked={s.autoLoadLastModel}
              onChange={(v) => update({ autoLoadLastModel: v })}
            />
          </Field>
        </Section>

        <Section collapsible title="診断" icon={<ClipboardList />}>
          <Field label="1 ページの設問の数" htmlFor="per-page">
            <Select
              id="per-page"
              value={String(s.itemsPerPage)}
              onChange={(v) => update({ itemsPerPage: Number(v) as ItemsPerPage })}
              options={[
                { value: '1', label: '1 問ずつ' },
                { value: '5', label: '5 問' },
                { value: '10', label: '10 問' },
              ]}
              className="w-32"
            />
          </Field>
          <Field
            label="答えたら次へ進む"
            htmlFor="auto-advance"
            hint="1 問ずつ表示するときに、答えると自動で次の設問へ進みます"
          >
            <Switch
              id="auto-advance"
              checked={s.autoAdvance}
              onChange={(v) => update({ autoAdvance: v })}
            />
          </Field>
        </Section>

        <Section
          collapsible
          title="データ"
          icon={<Database />}
          description="データはすべてこの端末のブラウザ内に保存されています"
        >
          <Field label="ストレージ使用量">
            <StorageUsage />
          </Field>
          <Field
            label="バックアップ"
            hint={`診断の結果・途中の回答・チャット・設定を JSON ファイルに書き出します${s.lastBackupAt ? `（前回: ${formatDateTime(s.lastBackupAt)}）` : ''}`}
          >
            <Button size="sm" onClick={() => void backup()}>
              書き出す
            </Button>
          </Field>
          <Field
            label="バックアップから復元"
            hint="内容を確かめてから、今のデータをすべて置き換えます"
          >
            <Button size="sm" onClick={() => restoreInput.current?.click()}>
              ファイルを選ぶ
            </Button>
            <input
              ref={restoreInput}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                try {
                  setPendingRestore(parseBackup(await file.text()));
                  setConfirm('restore');
                } catch (err) {
                  toast.error('このファイルからは復元できません', {
                    description: errorMessage(err),
                  });
                }
              }}
            />
          </Field>
          <Field
            label="すべてのデータを削除"
            hint="診断の結果・途中の回答・チャットを削除します（AI のモデルとキーは残ります）"
          >
            <Button size="sm" variant="danger" onClick={() => setConfirm('all')}>
              削除
            </Button>
          </Field>
          <Field label="設定を初期値に戻す">
            <Button size="sm" onClick={() => setConfirm('reset')}>
              <RotateCcw />
              リセット
            </Button>
          </Field>
        </Section>
      </PageBody>

      <ConfirmDialog
        open={confirm === 'restore'}
        title="バックアップから復元しますか？"
        description={
          pendingRestore
            ? `${formatDateTime(pendingRestore.exportedAt)} のバックアップ（診断の結果 ${pendingRestore.data.results.length} 件）で、今のデータをすべて置き換えます。`
            : ''
        }
        confirmLabel="復元"
        danger
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          setConfirm(null);
          if (!pendingRestore) return;
          try {
            await restoreBackup(pendingRestore);
            await useChat.getState().reload();
            update(sanitizeSettings(pendingRestore.settings));
            toast.success('復元しました');
          } catch (e) {
            toast.error('復元できませんでした', { description: errorMessage(e) });
          }
          setPendingRestore(null);
        }}
      />
      <ConfirmDialog
        open={confirm === 'all'}
        title="すべてのデータを削除しますか？"
        description="診断の結果・途中の回答・チャットをすべて削除します。必要ならバックアップを書き出してください。"
        confirmLabel="削除"
        danger
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          setConfirm(null);
          await clearAllData();
          await useChat.getState().clear();
          toast.success('すべてのデータを削除しました');
        }}
      />
      <ConfirmDialog
        open={confirm === 'reset'}
        title="設定を初期値に戻しますか？"
        confirmLabel="リセット"
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          s.reset();
          toast.success('設定を初期値に戻しました');
        }}
      />
    </>
  );
}
