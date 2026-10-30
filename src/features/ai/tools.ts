/**
 * AI が使えるツール（関数呼び出し）。
 * AI は判断の材料が必要なときにこれらを呼び、アプリ（プログラム）が記録を調べて結果を返す。
 */
import { db } from '@/lib/db/db';
import { analysis } from '@/lib/analysis/client';
import type { JsonValue, ToolCallInfo, ToolDeclaration } from '@/lib/llm/types';
import { getInstrument, scaleFamily } from '@/features/assess/registry';
import { BIG_FIVE_FULL } from '@/features/assess/instruments/bigfive';
import { DOMAIN_INSIGHTS } from '@/features/assess/instruments/bigfiveInsights';
import { levelOf, scoreMap } from '@/features/assess/scoring';
import { summarizeBigFive } from './appContext';

export const TOOL_DECLARATIONS: ToolDeclaration[] = [
  {
    name: 'list_assessments',
    description: 'これまでに受けた診断の一覧（日付・診断名・Grow タイプ・5 特性の得点）を調べる',
  },
  {
    name: 'get_facet_scores',
    description:
      '性格診断の 1 つの特性について、下位の側面（6 つ）の得点と説明を調べる。特性を掘り下げて話すときに使う',
    parameters: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          enum: ['E', 'A', 'C', 'N', 'O'],
          description: '特性の記号。E=外向性、A=協調性、C=誠実性、N=情緒の敏感さ、O=開放性',
        },
        result_id: { type: 'string', description: '診断の結果の id（省略すると最新）' },
      },
      required: ['domain'],
    },
  },
  {
    name: 'get_practice_summary',
    description:
      '練習（ロールプレイ・考え方の整理・3 つのよいこと・習慣プラン）の記録を集計する。週ごとの回数、ロールプレイの得点、考え方の整理で気持ちがどれだけ軽くなったか、よく出る考え方のくせ',
  },
  {
    name: 'compare_assessments',
    description: '最新と 1 つ前の性格診断を比べ、変化の大きい側面を返す',
  },
];

export const TOOL_LABELS: Record<string, string> = {
  list_assessments: '診断の一覧を確認中…',
  get_facet_scores: '側面の得点を確認中…',
  compare_assessments: '前回との違いを計算中…',
  get_practice_summary: '練習の記録を集計中…',
};

const scaleById = new Map(BIG_FIVE_FULL.scales.map((s) => [s.id, s]));

async function bigFiveResults() {
  return (await db.results.orderBy('createdAt').toArray()).filter(
    (r) => scaleFamily(r.instrumentId) === 'bigfive',
  );
}

export async function executeTool(call: ToolCallInfo): Promise<JsonValue> {
  const args = call.arguments ?? {};
  switch (call.name) {
    case 'list_assessments': {
      const results = await db.results.orderBy('createdAt').toArray();
      return results.map((r) =>
        scaleFamily(r.instrumentId) === 'bigfive'
          ? (summarizeBigFive(r) as unknown as JsonValue)
          : { resultId: r.id, instrument: getInstrument(r.instrumentId)?.title ?? r.instrumentId },
      );
    }
    case 'get_facet_scores': {
      const domain = String(args.domain ?? '');
      const results = await bigFiveResults();
      const r = results.find((x) => x.id === args.result_id) ?? results.at(-1);
      if (!r) return { error: 'まだ性格診断の結果がありません' };
      const d = scaleById.get(domain);
      if (!d || d.parent) return { error: `特性 ${domain} はありません` };
      const map = scoreMap(r.scores);
      const level = levelOf(map[domain]?.pomp ?? 50);
      return {
        domain: d.label,
        score: map[domain]?.pomp ?? null,
        insight: DOMAIN_INSIGHTS[domain]?.[level] ?? null,
        facets: BIG_FIVE_FULL.scales
          .filter((s) => s.parent === domain)
          .map((s) => ({
            name: s.label,
            description: s.description,
            score: map[s.id]?.pomp ?? null,
            tendency: (map[s.id]?.pomp ?? 50) >= 50 ? s.highLabel : s.lowLabel,
          })),
      };
    }
    case 'compare_assessments': {
      const results = await bigFiveResults();
      if (results.length < 2) return { error: '比べるには性格診断の結果が 2 つ以上必要です' };
      const diffs = await analysis().compare(results.at(-2)!, results.at(-1)!);
      return {
        before: new Date(results.at(-2)!.createdAt).toISOString().slice(0, 10),
        after: new Date(results.at(-1)!.createdAt).toISOString().slice(0, 10),
        changes: diffs.slice(0, 8).map((d) => ({
          name: scaleById.get(d.scaleId)?.label ?? d.scaleId,
          before: d.before,
          after: d.after,
          diff: d.diff,
        })),
        note: '10 以内の変化は、その日の気分などによる揺れの範囲かもしれない',
      };
    }
    case 'get_practice_summary': {
      const summary = await analysis().practiceSummary(await db.logs.toArray());
      return summary as unknown as JsonValue;
    }
    default:
      return { error: `unknown tool: ${call.name}` };
  }
}
