import { useEffect } from 'react';
import { toast } from 'sonner';
import { navigate } from 'wouter/use-hash-location';
import { holdPendingKey } from '@/lib/cloud/keyVault';
import { handleOpenRouterCallback } from '@/lib/cloud/openrouterAuth';
import { llm } from '@/lib/llm/client';
import { subscribeSharedModels } from '@/lib/llm/modelStorage';
import { useEngine } from '@/features/engine/engineStore';
import { useSettings } from '@/features/settings/settingsStore';

/**
 * 起動時の処理:
 * - 保存済みモデル一覧の取得（同じ github.io の他のサイトが保存したモデルも含む）
 * - 前回のモデルの自動読み込み（設定でオン かつ 保存領域に存在する場合）
 * - それ以外は、モデルがあればアイドル時に Wasm ランタイムを先読みする
 * - 「OpenRouter でログイン」から戻ってきたら、キーを受け取って「AI」画面で保存してもらう
 */
const idle: (cb: () => void) => void =
  typeof requestIdleCallback === 'function'
    ? (cb) => requestIdleCallback(cb, { timeout: 3000 })
    : (cb) => setTimeout(cb, 1500);

export function useStartup() {
  useEffect(() => {
    void handleOpenRouterCallback().then((r) => {
      if (r.status === 'none') return;
      navigate('/ai', { replace: true });
      if (r.status === 'error') {
        toast.error(r.message);
        return;
      }
      holdPendingKey('openrouter', r.key);
      const { cloudConsents, update } = useSettings.getState();
      if (cloudConsents.openrouter) update({ aiProvider: 'openrouter' });
      toast.success('OpenRouter からキーを受け取りました', {
        description: '保存のしかた（合言葉）を決めて登録してください。',
      });
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void useEngine.getState().detectWebGpu();
    (async () => {
      const { autoLoadLastModel, lastModelName } = useSettings.getState();
      await useEngine.getState().refreshStoredModels();
      if (cancelled) return;
      const stored = useEngine.getState().storedModels;
      if (autoLoadLastModel && lastModelName && stored.some((m) => m.name === lastModelName)) {
        void useEngine.getState().load({ kind: 'stored', name: lastModelName });
        return;
      }
      idle(() => {
        if (!cancelled && stored.length > 0 && useEngine.getState().status === 'empty') {
          llm.warmup().catch((e) => console.warn('Wasm の先読みに失敗しました', e));
        }
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 同じ github.io の他のサイト・タブでモデルが保存・削除されたら一覧を更新する
  useEffect(() => {
    const refresh = () => void useEngine.getState().refreshStoredModels();
    const unsubscribe = subscribeSharedModels(refresh);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
}
