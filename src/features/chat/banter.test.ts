import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls: { task: string; system: string }[] = [];

vi.mock('@/features/cloud/aiClient', () => ({
  aiReadyNow: () => true,
  modelLabel: (task: string) => (task === 'aside' ? 'B · model-b' : 'A · model-a'),
  ai: {
    generate: vi.fn(
      async (
        req: { settings: { systemPrompt: string } },
        onEvent: (e: unknown) => void,
        _t: unknown,
        task: string,
      ) => {
        calls.push({ task, system: req.settings.systemPrompt });
        onEvent({ type: 'delta', text: `${task}の発言${calls.length}` });
        return { status: 'done' };
      },
    ),
    cancel: vi.fn(),
    resetConversation: vi.fn(async () => {}),
  },
}));

// requestAnimationFrame（ストリーミングの描画）を Node で動かす
globalThis.requestAnimationFrame = ((cb: () => void) => setTimeout(cb, 0)) as never;
globalThis.cancelAnimationFrame = ((id: number) => clearTimeout(id)) as never;

const { useChat } = await import('./chatStore');
const { useSettings } = await import('@/features/settings/settingsStore');

async function settle() {
  for (let i = 0; i < 50 && useChat.getState().isGenerating; i++)
    await new Promise((r) => setTimeout(r, 10));
  await new Promise((r) => setTimeout(r, 20));
}

describe('掛け合い', () => {
  beforeEach(async () => {
    calls.length = 0;
    await useChat.getState().clear();
    useSettings.getState().update({
      persona: 'partner',
      secondPersona: 'analyst',
      useTools: false,
      shareAppState: false,
    });
  });

  it('相棒のあと、2 人目と相棒が交互に、それぞれの AI で話す', async () => {
    useSettings.getState().update({ banterTurns: 3 });
    expect(useChat.getState().send('こんにちは')).toBe(true);
    await settle();
    expect(calls.map((c) => c.task)).toEqual(['chat', 'aside', 'chat', 'aside']);
    const msgs = useChat.getState().messages;
    expect(msgs.map((m) => m.speaker ?? 'user')).toEqual([
      'user',
      'partner',
      'analyst',
      'partner',
      'analyst',
    ]);
    expect(msgs.filter((m) => m.aside)).toHaveLength(3);
    expect(msgs[2].model).toBe('B · model-b');
    expect(calls[1].system).toContain('リコ');
    expect(calls[2].system).toContain('ハル');
  });

  it('2 人目がいなければ掛け合いはしない。続けてもらうと 2 回だけ話す', async () => {
    useSettings.getState().update({ secondPersona: '', banterTurns: 3 });
    useChat.getState().send('やあ');
    await settle();
    expect(calls.map((c) => c.task)).toEqual(['chat']);

    useSettings.getState().update({ secondPersona: 'cat', banterTurns: 1 });
    useChat.getState().continueBanter();
    await settle();
    expect(calls.map((c) => c.task)).toEqual(['chat', 'aside', 'chat']);
  });
});
