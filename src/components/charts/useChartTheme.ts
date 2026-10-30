import { useEffect, useState } from 'react';

/** グラフの色（CSS 変数から読む。ダークモード・配色の切り替えに合わせて変わる） */
export interface ChartTheme {
  text: string;
  muted: string;
  grid: string;
  accent: string;
  series: string[];
  surface: string;
}

/** CSS の色（oklch など）を #rrggbb にする（ECharts は oklch を読めないため） */
function toHex(color: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx || !color) return color;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

function readTheme(): ChartTheme {
  const css = getComputedStyle(document.documentElement);
  const dark = document.documentElement.classList.contains('dark');
  const v = (name: string) => toHex(css.getPropertyValue(name).trim());
  return {
    text: v(dark ? '--color-slate-200' : '--color-slate-700'),
    muted: v(dark ? '--color-slate-400' : '--color-slate-500'),
    grid: v(dark ? '--color-slate-800' : '--color-slate-200'),
    accent: v('--color-accent-500'),
    surface: dark ? v('--color-slate-900') : '#ffffff',
    series: [v('--viz-1'), v('--viz-2'), v('--viz-3'), v('--viz-4'), v('--viz-5')],
  };
}

/** <html> のクラス・配色が変わったら作り直すためのフック */
export function useChartTheme(): ChartTheme | null {
  const [theme, setTheme] = useState<ChartTheme | null>(null);
  useEffect(() => {
    const update = () => setTheme(readTheme());
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-dark-palette'],
    });
    return () => obs.disconnect();
  }, []);
  return theme;
}
