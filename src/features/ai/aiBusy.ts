import { create } from 'zustand';

/**
 * エンジンは同時に 1 つしか生成できないので、誰が使っているかを共有する。
 * 種類ごとに使う AI を変えられる（設定の「場面ごとの AI」）。
 * chat: チャット、assist: 解説、reaction: ひとこと、roleplay: ロールプレイ、review: 分析へのコメント
 */
export type AiTask = 'chat' | 'assist' | 'reaction' | 'roleplay' | 'review';

export const useAiBusy = create<{ task: AiTask | null }>()(() => ({ task: null }));

export function isAiBusy(): boolean {
  return useAiBusy.getState().task !== null;
}
