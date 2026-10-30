import {
  BookOpen,
  ChartNoAxesCombined,
  CircleHelp,
  Compass,
  Dumbbell,
  House,
  MessageCircleHeart,
  Sparkles,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** 短い説明（ホームのカードなどで表示） */
  description?: string;
}

/**
 * メインのナビゲーション（スマホの下部ナビ・PC のサイドバー）。
 * 「知る → 学ぶ → 練習する → ふりかえる」の流れに沿って並べる。
 * ページを追加するときは、まずこの 4 本柱のどこに入るかを考え、柱のページの中に置く（ナビを増やしすぎない）。
 */
export const PILLAR_ITEMS: NavItem[] = [
  {
    to: '/know',
    label: '知る',
    icon: Compass,
    description: '性格・適性の診断で、自分の傾向をつかむ',
  },
  {
    to: '/learn',
    label: '学ぶ',
    icon: BookOpen,
    description: '社会で生きていくための考え方を学ぶ',
  },
  {
    to: '/practice',
    label: '練習',
    icon: Dumbbell,
    description: 'ロールプレイと改善トレーニングで、身につける',
  },
  {
    to: '/reflect',
    label: 'ふりかえる',
    icon: ChartNoAxesCombined,
    description: '記録を分析して、変化と次の一歩を見つける',
  },
];

export const CHAT_ITEM: NavItem = { to: '/chat', label: 'AI と話す', icon: MessageCircleHeart };
export const AI_ITEM: NavItem = { to: '/ai', label: 'AI の設定', icon: Sparkles };
export const HOME_ITEM: NavItem = { to: '/', label: 'ホーム', icon: House };
export const SETTINGS_ITEM: NavItem = { to: '/settings', label: '設定', icon: Settings };
export const HELP_ITEM: NavItem = { to: '/help', label: 'ヘルプ', icon: CircleHelp };

/** スマホの下部ナビ（ヘルプはヘッダーにあるので入れない） */
export const BOTTOM_ITEMS: NavItem[] = [HOME_ITEM, ...PILLAR_ITEMS, SETTINGS_ITEM];
/** PC のサイドバー */
export const SIDE_ITEMS: NavItem[] = [HOME_ITEM, ...PILLAR_ITEMS, CHAT_ITEM];
export const SIDE_SUB_ITEMS: NavItem[] = [AI_ITEM, SETTINGS_ITEM, HELP_ITEM];

export function isActivePath(location: string, to: string): boolean {
  return to === '/' ? location === '/' : location === to || location.startsWith(`${to}/`);
}
