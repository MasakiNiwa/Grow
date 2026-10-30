import { Cpu, Power, Share2 } from 'lucide-react';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SHARED_MODEL_SITES } from '@/lib/constants';
import { formatBytes, formatDuration } from '@/lib/utils/format';
import { resolveBackend, useEngine } from '@/features/engine/engineStore';
import { WebGpuNotice } from '@/features/engine/WebGpuNotice';
import { CloudSettings } from '@/features/cloud/CloudSettings';
import { TaskModels } from '@/features/cloud/TaskModels';
import { LoadProgressCard } from '@/features/models/LoadProgressCard';
import { ModelDownload } from '@/features/models/ModelDownload';
import { ModelImport } from '@/features/models/ModelImport';
import { StoredModelList } from '@/features/models/StoredModelList';
import { BACKEND_LABELS } from '@/features/settings/labels';
import { useSettings } from '@/features/settings/settingsStore';

function CurrentModel() {
  const status = useEngine((s) => s.status);
  const model = useEngine((s) => s.model);
  const error = useEngine((s) => s.error);
  const fallbackLog = useEngine((s) => s.fallbackLog);
  const unload = useEngine((s) => s.unload);
  const backendSetting = useSettings((s) => s.backend);
  const webgpu = useEngine((s) => s.webgpu);
  const maxNumTokens = useSettings((s) => s.maxNumTokens);
  const backend = resolveBackend(backendSetting, webgpu);

  if (status === 'error') {
    return (
      <Card className="border-rose-200 p-4 text-sm text-rose-700 dark:border-rose-900 dark:text-rose-300">
        <p className="font-medium">読み込みに失敗しました</p>
        <p className="mt-1 break-all whitespace-pre-line">{error}</p>
      </Card>
    );
  }
  if (status !== 'ready' || !model) return null;
  const needsReload =
    (fallbackLog.length === 0 && model.backend !== backend) || model.maxNumTokens !== maxNumTokens;
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          <Cpu className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-slate-500 dark:text-slate-400">使用中のモデル</div>
          <div className="truncate font-semibold" title={model.name}>
            {model.name}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
            <span>{formatBytes(model.sizeBytes)}</span>
            <span>{BACKEND_LABELS[model.backend]}</span>
            <span>文脈長 {model.maxNumTokens}</span>
            <span>読み込み {formatDuration(model.loadTimeMs)}</span>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => void unload()} title="モデルを解放">
          <Power />
          解放
        </Button>
      </div>
      {needsReload && (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          エンジン設定が変更されています。反映するにはモデルを読み込み直してください。
        </p>
      )}
    </Card>
  );
}

/** AI の接続先とモデル（クラウド AI・端末内のモデル・場面ごとの AI） */
export default function AiPage() {
  const loading = useEngine((s) => s.status === 'loading');
  return (
    <>
      <PageHeader title="AI の設定" back="/settings" />
      <PageBody>
        <p className="px-1 text-sm text-slate-600 dark:text-slate-400">
          Grow の AI は、クラウド AI（Gemini・OpenAI・Claude・OpenRouter）の API
          キーか、この端末のブラウザの中で動くローカル AI（LiteRT-LM・Gemma 4 など）で動きます。AI
          がなくても、診断や記録などの機能はすべて使えます。キャラクターは「設定 → AI
          のキャラクター」で選べます。
        </p>
        <CloudSettings />
        <TaskModels />
        <WebGpuNotice />
        <CurrentModel />
        <LoadProgressCard />
        <StoredModelList />
        {!loading && <ModelImport />}
        <ModelDownload />
        <Card className="flex gap-3 p-4 text-sm text-slate-600 dark:text-slate-400">
          <Share2 className="mt-0.5 size-5 shrink-0 text-accent-600" />
          <div className="space-y-1">
            <p className="font-medium text-slate-800 dark:text-slate-200">
              モデルは他のサイトと共有されます
            </p>
            <p>
              保存したモデルは、同じ github.io（masakiniwa.github.io）の他のサイト（
              {SHARED_MODEL_SITES.map((site, i) => (
                <span key={site.url}>
                  {i > 0 && '・'}
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-700 underline dark:text-accent-300"
                  >
                    {site.name}
                  </a>
                </span>
              ))}
              など）と共通の保存領域に置かれ、どのサイトからでも使えます。他のサイトで保存済みのモデルも上の一覧に表示されます。⤓
              ボタンで端末のファイルとして書き出す（バックアップ）こともでき、書き出したファイルは「ファイルを選択」で戻せます。
            </p>
          </div>
        </Card>
      </PageBody>
    </>
  );
}
