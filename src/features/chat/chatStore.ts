/**
 * AI とのチャット（1 本の会話を IndexedDB に保存して続ける）。
 *
 * - 送信するたびに、アプリの状態（診断の結果の要約など）を構造化データにして発話の前に付ける
 *   （前回と同じなら付けない＝KV キャッシュを活かす）
 * - AI はツールで診断の記録を調べられる（実行はメインスレッドのプログラム）
 * - 2 人目のキャラクターを設定していれば、メインの応答のあとに別の視点から一言添える
 *   （一言はメインの会話の履歴には入れない）
 */
import { toast } from 'sonner';
import { create } from 'zustand';
import { db } from '@/lib/db/db';
import { ai, aiReadyNow, modelLabel } from '@/features/cloud/aiClient';
import type { ChatTurn, GenerationStats } from '@/lib/llm/types';
import { errorMessage } from '@/lib/utils/format';
import { createId } from '@/lib/utils/id';
import { useAiBusy } from '@/features/ai/aiBusy';
import { isAiBusyExceptReaction, preemptReaction } from '@/features/ai/oneshot';
import { buildSecondVoicePrompt, getConversationSettings } from '@/features/ai/prompt';
import { getPersona } from '@/features/ai/personas';
import { buildAppState, formatAppState } from '@/features/ai/appContext';
import { executeTool, TOOL_DECLARATIONS, TOOL_LABELS } from '@/features/ai/tools';
import { useSettings } from '@/features/settings/settingsStore';
import { estimateTokens, trimHistory } from './historyBudget';
import { splitThinking } from './thinking';
import type { ChatRecord } from './types';

export interface ChatMessage extends ChatRecord {
  status?: 'streaming' | 'done' | 'cancelled' | 'error';
  stats?: GenerationStats;
}

interface ChatState {
  ready: boolean;
  messages: ChatMessage[];
  isGenerating: boolean;
  /** 実行中のツールの表示名 */
  toolActivity: string | null;
  init: () => Promise<void>;
  /** 送信する。受け付けたら true（入力欄を空にしてよい） */
  send: (text: string) => boolean;
  stop: () => void;
  clear: () => Promise<void>;
  /** DB の内容で表示を作り直す（バックアップの復元のあとなど） */
  reload: () => Promise<void>;
}

/** メインの会話の履歴（2 人目の一言とエラーは除く） */
export function toHistory(messages: ChatMessage[]): ChatTurn[] {
  return messages
    .filter((m) => !m.aside && (m.role === 'user' || (m.status !== 'error' && m.text)))
    .map((m) => ({
      id: m.id,
      role: m.role,
      text: m.role === 'user' && m.context ? `${m.context}\n\n${m.text}` : m.text,
    }));
}

function lastContext(messages: ChatMessage[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].context) return messages[i].context;
  }
  return undefined;
}

function persistMessage(m: ChatMessage): void {
  const { status: _s, stats: _st, ...record } = m;
  void db.chat.put(record).catch((e) => console.warn('チャットを保存できませんでした', e));
}

export const useChat = create<ChatState>()((set, get) => {
  let initPromise: Promise<void> | null = null;

  const canGenerate = (): boolean => {
    if (!aiReadyNow('chat')) {
      toast.error('AI が使えません', {
        description:
          '「AI」画面で端末内のモデルを読み込むか、クラウド AI（Gemini・OpenAI・Claude・OpenRouter）のキーを解除してください',
      });
      return false;
    }
    if (isAiBusyExceptReaction() || get().isGenerating) {
      toast.info('AI が別の応答を生成中です。少し待ってから送ってください');
      return false;
    }
    return true;
  };

  const patch = (id: string, p: Partial<ChatMessage>) =>
    set((st) => ({ messages: st.messages.map((m) => (m.id === id ? { ...m, ...p } : m)) }));

  /** ストリーミングの描画（フレーム単位にまとめる） */
  const streamer = (id: string) => {
    let text = '';
    let thought = '';
    let raf = 0;
    const view = () => {
      const s = splitThinking(text);
      return {
        text: s.answer,
        thinking: [thought, s.thought].filter(Boolean).join('\n') || undefined,
      };
    };
    const flush = () => {
      raf = 0;
      patch(id, view());
    };
    return {
      push(t: string, channel?: string) {
        if (channel) thought += t;
        else text += t;
        if (!raf) raf = requestAnimationFrame(flush);
      },
      end() {
        cancelAnimationFrame(raf);
        flush();
        return view();
      },
    };
  };

  /** 2 人目のキャラクターの一言 */
  const secondVoice = async (user: ChatMessage, reply: ChatMessage) => {
    const settings = useSettings.getState();
    if (!settings.secondPersona || settings.secondPersona === settings.persona) return;
    if (!aiReadyNow('aside')) return;
    const main = getPersona(settings.persona, settings);
    const second = getPersona(settings.secondPersona, settings);
    const id = createId();
    const aside: ChatMessage = {
      id,
      role: 'assistant',
      text: '',
      speaker: second.id,
      aside: true,
      model: modelLabel('aside'),
      createdAt: Date.now(),
      status: 'streaming',
    };
    set((st) => ({ messages: [...st.messages, aside] }));
    const stream = streamer(id);
    try {
      const result = await ai.generate(
        {
          mode: 'oneshot',
          settings: {
            systemPrompt: buildSecondVoicePrompt(settings, second, main),
            temperature: settings.temperature,
            topK: settings.topK,
            topP: settings.topP,
            maxOutputTokens: 200,
            enableThinking: false,
          },
          history: [],
          message: {
            id: createId(),
            role: 'user',
            text: `ユーザー: ${user.text}\n${main.name}: ${reply.text}\n\nこの会話に、あなたの視点から一言添えてください。`,
          },
          assistantId: id,
          keepChat: settings.keepChatContext,
        },
        (ev) => {
          if (ev.type === 'delta' && !ev.channel) stream.push(ev.text);
        },
        undefined,
        'aside',
      );
      const view = stream.end();
      if (!view.text.trim()) {
        set((st) => ({ messages: st.messages.filter((m) => m.id !== id) }));
        return;
      }
      patch(id, { text: view.text.trim(), status: result.status });
    } catch (e) {
      // 一言は添え物なので、失敗しても目立たせずに消す
      console.warn('2 人目のキャラクターの一言を作れませんでした', e);
      set((st) => ({ messages: st.messages.filter((m) => m.id !== id) }));
      return;
    }
    const saved = get().messages.find((m) => m.id === id);
    if (saved) persistMessage(saved);
  };

  const generate = async (history: ChatMessage[], user: ChatMessage): Promise<void> => {
    await preemptReaction();
    if (useAiBusy.getState().task) {
      toast.info('AI が別の応答を生成中です。少し待ってから送ってください');
      return;
    }
    const settings = useSettings.getState();
    const tools = settings.useTools;
    const assistantId = createId();
    const assistant: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      text: '',
      speaker: settings.persona,
      model: modelLabel('chat'),
      createdAt: Date.now(),
      status: 'streaming',
    };
    set({ messages: [...history, user, assistant], isGenerating: true, toolActivity: null });
    useAiBusy.setState({ task: 'chat' });
    persistMessage(user);
    const stream = streamer(assistantId);
    const usedTools: string[] = [];
    let done = false;

    try {
      const conversation = getConversationSettings(settings, { tools });
      const messageText = user.context ? `${user.context}\n\n${user.text}` : user.text;
      const trimmed = trimHistory(toHistory(history), {
        maxNumTokens: settings.maxNumTokens,
        maxOutputTokens: settings.maxOutputTokens,
        reserved:
          estimateTokens(conversation.systemPrompt ?? '') +
          (tools ? estimateTokens(JSON.stringify(TOOL_DECLARATIONS)) : 0) +
          estimateTokens(messageText) +
          64,
      });
      const result = await ai.generate(
        {
          mode: 'chat',
          settings: conversation,
          history: trimmed,
          message: { id: user.id, role: 'user', text: messageText },
          assistantId,
          tools: tools ? TOOL_DECLARATIONS : undefined,
        },
        (ev) => {
          if (ev.type === 'tool-call') {
            usedTools.push(ev.call.name);
            set({ toolActivity: TOOL_LABELS[ev.call.name] ?? ev.call.name });
          } else if (ev.type === 'tool-result') {
            set({ toolActivity: null });
          } else if (ev.type === 'delta') {
            stream.push(ev.text, ev.channel);
          }
        },
        tools ? (call) => executeTool(call) : undefined,
        'chat',
      );
      patch(assistantId, {
        ...stream.end(),
        status: result.status,
        stats: result.stats,
        tools: usedTools.length ? usedTools : undefined,
      });
      done = result.status === 'done';
    } catch (e) {
      const message = errorMessage(e);
      console.error(e);
      patch(assistantId, { ...stream.end(), status: 'error', error: message });
      toast.error('生成中にエラーが発生しました', { description: message });
    } finally {
      const saved = get().messages.find((m) => m.id === assistantId);
      if (saved) persistMessage(saved);
    }
    try {
      const reply = get().messages.find((m) => m.id === assistantId);
      if (done && reply?.text) await secondVoice(user, reply);
    } finally {
      useAiBusy.setState({ task: null });
      set({ isGenerating: false, toolActivity: null });
    }
  };

  /** 発話に付けるアプリの状態（前回と同じなら付けない） */
  const contextFor = async (history: ChatMessage[]): Promise<string | undefined> => {
    if (!useSettings.getState().shareAppState) return undefined;
    try {
      const text = formatAppState(await buildAppState('chat'));
      const normalize = (s: string | undefined) => s?.replace(/"now":"[^"]*",?/, '');
      return normalize(text) === normalize(lastContext(history)) ? undefined : text;
    } catch (e) {
      console.warn('アプリの状態を取得できませんでした', e);
      return undefined;
    }
  };

  return {
    ready: false,
    messages: [],
    isGenerating: false,
    toolActivity: null,

    init() {
      initPromise ??= (async () => {
        try {
          const records = await db.chat.orderBy('createdAt').toArray();
          set({ messages: records.map((r) => ({ ...r, status: r.error ? 'error' : 'done' })) });
        } catch (e) {
          console.warn('チャット履歴を読み込めませんでした', e);
        }
        set({ ready: true });
      })();
      return initPromise;
    },

    send(text) {
      const trimmed = text.trim();
      if (!trimmed || !canGenerate()) return false;
      void (async () => {
        const history = get().messages;
        const user: ChatMessage = {
          id: createId(),
          role: 'user',
          text: trimmed,
          context: await contextFor(history),
          createdAt: Date.now(),
          status: 'done',
        };
        await generate(history, user);
      })();
      return true;
    },

    stop() {
      if (get().isGenerating) ai.cancel();
    },

    async reload() {
      if (get().isGenerating) ai.cancel();
      void ai.resetConversation();
      const records = await db.chat.orderBy('createdAt').toArray();
      set({ messages: records.map((r) => ({ ...r, status: r.error ? 'error' : 'done' })) });
    },

    async clear() {
      if (get().isGenerating) ai.cancel();
      set({ messages: [] });
      void ai.resetConversation();
      await db.chat.clear();
    },
  };
});
