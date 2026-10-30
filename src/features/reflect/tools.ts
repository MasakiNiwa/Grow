import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { Dumbbell, GitCompareArrows, LineChart, ListTree, type LucideIcon } from 'lucide-react';

/**
 * 分析ツールの登録先（ふりかえるページ）。
 * ツールを足すときは、コンポーネントを作ってここに 1 行足すだけでページに並ぶ。
 * 各ツールは自分でデータ（db）を読み、重い計算は lib/analysis（Worker）に任せる。
 */
export interface AnalysisTool {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  component: LazyExoticComponent<ComponentType>;
}

export const ANALYSIS_TOOLS: AnalysisTool[] = [
  {
    id: 'trend',
    title: '推移',
    description: '性格の特性が、時間とともにどう変わったか',
    icon: LineChart,
    component: lazy(() => import('./TrendTool')),
  },
  {
    id: 'compare',
    title: '2 回を比べる',
    description: '2 つの結果を選んで、変わったところを大きい順に',
    icon: GitCompareArrows,
    component: lazy(() => import('./CompareTool')),
  },
  {
    id: 'drill',
    title: 'ドリルダウン',
    description: '結果を、特性 → 側面 → 設問ごとの回答まで掘り下げる',
    icon: ListTree,
    component: lazy(() => import('./DrillTool')),
  },
  {
    id: 'practice',
    title: '練習の記録',
    description: '練習の回数・ロールプレイの得点・考え方の整理の効果',
    icon: Dumbbell,
    component: lazy(() => import('./PracticeTool')),
  },
];
