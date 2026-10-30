import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import {
  BookOpen,
  Dumbbell,
  GitCompareArrows,
  HeartPulse,
  LineChart,
  ListTree,
  Network,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

/**
 * 分析ツールの登録先（ふりかえるページ）。
 * ツールを足すときは、コンポーネントを作ってここに 1 行足すだけでページに並ぶ。
 * 各ツールは自分でデータ（db）を読み、重い計算は lib/analysis（Worker）に任せる。
 */
export interface AnalysisTool {
  id: string;
  /** まとまり（ふりかえるページで、まとまりごとに並べる） */
  group: 'self' | 'daily' | 'growth';
  title: string;
  description: string;
  icon: LucideIcon;
  component: LazyExoticComponent<ComponentType>;
}

export const ANALYSIS_TOOLS: AnalysisTool[] = [
  {
    id: 'profile',
    group: 'self',
    title: '総合プロフィール',
    description: '性格・興味・価値観を並べて、そのつながりを見る',
    icon: UserRound,
    component: lazy(() => import('./ProfileTool')),
  },
  {
    id: 'trend',
    group: 'self',
    title: '推移',
    description: '性格・興味・価値観が、時間とともにどう変わったか',
    icon: LineChart,
    component: lazy(() => import('./TrendTool')),
  },
  {
    id: 'compare',
    group: 'self',
    title: '2 回を比べる',
    description: '2 つの結果を選んで、変わったところを大きい順に',
    icon: GitCompareArrows,
    component: lazy(() => import('./CompareTool')),
  },
  {
    id: 'drill',
    group: 'self',
    title: 'ドリルダウン',
    description: '結果を、特性 → 側面 → 設問ごとの回答まで掘り下げる',
    icon: ListTree,
    component: lazy(() => import('./DrillTool')),
  },
  {
    id: 'condition',
    group: 'daily',
    title: 'コンディション',
    description: '気分・エネルギー・ストレス・睡眠の推移、曜日、できごとと気分',
    icon: HeartPulse,
    component: lazy(() => import('./ConditionTool')),
  },
  {
    id: 'correlation',
    group: 'daily',
    title: '関係を探る',
    description: '睡眠と気分、練習とストレスなど、何と何が一緒に動いているか',
    icon: Network,
    component: lazy(() => import('./CorrelationTool')),
  },
  {
    id: 'learning',
    group: 'growth',
    title: '学びの記録',
    description: '分野ごとの正答率と進み具合',
    icon: BookOpen,
    component: lazy(() => import('./LearningTool')),
  },
  {
    id: 'practice',
    group: 'growth',
    title: '練習の記録',
    description: '練習の回数・ロールプレイの得点・考え方の整理の効果',
    icon: Dumbbell,
    component: lazy(() => import('./PracticeTool')),
  },
];

export const TOOL_GROUPS: Record<AnalysisTool['group'], string> = {
  self: '自分の傾向',
  daily: '毎日の記録',
  growth: '学びと練習',
};
