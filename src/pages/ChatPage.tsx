import { PageHeader } from '@/app/PageHeader';
import { ClearButton } from '@/components/ui/ClearButton';
import { ModelStatusChip } from '@/features/engine/ModelStatusChip';
import { ChatView } from '@/features/chat/ChatView';
import { useChat } from '@/features/chat/chatStore';

/** AI と話す: キャラクターとのチャット（アプリの状態と記録をもとに話す） */
export default function ChatPage() {
  const count = useChat((s) => s.messages.length);
  return (
    <>
      <PageHeader
        title="AI と話す"
        actions={
          <ClearButton
            onClear={() => void useChat.getState().clear()}
            disabled={count === 0}
            confirm="会話をすべて消して、新しく話し始めます。"
          />
        }
      />
      <div className="shrink-0 border-b border-slate-200 px-3 py-1.5 dark:border-slate-800">
        <div className="mx-auto flex max-w-3xl items-center gap-2 text-xs text-slate-500">
          使う AI
          <ModelStatusChip className="max-w-64" />
        </div>
      </div>
      <ChatView />
    </>
  );
}
