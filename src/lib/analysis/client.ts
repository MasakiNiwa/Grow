import * as Comlink from 'comlink';
import { analysisApi, type AnalysisApi } from './analysis';

type Remote = {
  [K in keyof AnalysisApi]: (
    ...a: Parameters<AnalysisApi[K]>
  ) => Promise<ReturnType<AnalysisApi[K]>>;
};

let remote: Remote | null = null;

/**
 * 分析の呼び出し口。Worker が使えればそちらで計算し（画面を止めない）、使えなければその場で計算する。
 * どちらでも Promise を返すので、呼び出す側は区別しなくてよい。
 */
export function analysis(): Remote {
  if (remote) return remote;
  if (typeof Worker !== 'undefined') {
    try {
      const worker = new Worker(new URL('./analysis.worker.ts', import.meta.url), {
        name: 'analysis',
      });
      remote = Comlink.wrap<AnalysisApi>(worker) as unknown as Remote;
      return remote;
    } catch {
      // 下のその場で計算する方へ
    }
  }
  remote = Object.fromEntries(
    Object.entries(analysisApi).map(([k, fn]) => [
      k,
      (...args: unknown[]) => Promise.resolve((fn as (...a: unknown[]) => unknown)(...args)),
    ]),
  ) as unknown as Remote;
  return remote;
}
