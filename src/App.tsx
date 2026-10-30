import { lazy, Suspense } from 'react';
import { Toaster } from 'sonner';
import { Route, Router, Switch } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { AppLayout } from '@/app/AppLayout';
import { useStartup } from '@/app/useStartup';
import { useTheme } from '@/app/useTheme';
import HomePage from '@/pages/HomePage';
import { useSettings } from '@/features/settings/settingsStore';

// ホーム以外のページは必要になってから読み込む
const KnowPage = lazy(() => import('@/pages/KnowPage'));
const AssessRunPage = lazy(() => import('@/pages/AssessRunPage'));
const ResultPage = lazy(() => import('@/pages/ResultPage'));
const LearnPage = lazy(() => import('@/pages/LearnPage'));
const TopicPage = lazy(() => import('@/pages/TopicPage'));
const PracticePage = lazy(() => import('@/pages/PracticePage'));
const ScenarioPage = lazy(() => import('@/pages/ScenarioPage'));
const AiRoleplayPage = lazy(() => import('@/pages/AiRoleplayPage'));
const WorksheetPage = lazy(() => import('@/pages/WorksheetPage'));
const ReflectPage = lazy(() => import('@/pages/ReflectPage'));
const ChatPage = lazy(() => import('@/pages/ChatPage'));
const AiPage = lazy(() => import('@/pages/AiPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const HelpPage = lazy(() => import('@/pages/HelpPage'));

export default function App() {
  useTheme();
  useStartup();
  const theme = useSettings((s) => s.theme);
  return (
    // GitHub Pages ではサーバー側のルーティングができないためハッシュルーティングを使う
    <Router hook={useHashLocation}>
      <AppLayout>
        <Suspense fallback={null}>
          <Switch>
            <Route path="/know" component={KnowPage} />
            <Route path="/know/take/:id" component={AssessRunPage} />
            <Route path="/know/result/:id" component={ResultPage} />
            <Route path="/learn" component={LearnPage} />
            <Route path="/learn/:id" component={TopicPage} />
            <Route path="/practice" component={PracticePage} />
            <Route path="/practice/roleplay/:id" component={ScenarioPage} />
            <Route path="/practice/ai/:id" component={AiRoleplayPage} />
            <Route path="/practice/work/:kind" component={WorksheetPage} />
            <Route path="/reflect/:tool?" component={ReflectPage} />
            <Route path="/chat" component={ChatPage} />
            <Route path="/ai" component={AiPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route path="/help" component={HelpPage} />
            <Route component={HomePage} />
          </Switch>
        </Suspense>
      </AppLayout>
      <Toaster
        theme={theme}
        position="top-center"
        closeButton
        duration={3000}
        toastOptions={{ className: 'text-sm' }}
      />
    </Router>
  );
}
