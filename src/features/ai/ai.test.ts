import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/db/db';
import { DEFAULT_SETTINGS } from '@/features/settings/settingsStore';
import { BIG_FIVE_QUICK } from '@/features/assess/instruments/bigfive';
import { scoreAnswers } from '@/features/assess/scoring';
import type { AssessmentResult } from '@/features/assess/types';
import { toHistory } from '@/features/chat/chatStore';
import { buildAppState, summarizeBigFive } from './appContext';
import { bigFiveDeepDivePrompt } from './externalPrompt';
import { CUSTOM_PERSONA_ID, PERSONAS, fillLine, getPersona } from './personas';
import { buildSecondVoicePrompt, buildSystemPrompt } from './prompt';
import { executeTool } from './tools';

function result(id: string, createdAt: number, value: number): AssessmentResult {
  const answers = Object.fromEntries(BIG_FIVE_QUICK.items.map((i) => [i.id, value]));
  return {
    id,
    instrumentId: BIG_FIVE_QUICK.id,
    instrumentVersion: 1,
    createdAt,
    durationMs: 1,
    answers,
    scores: scoreAnswers(BIG_FIVE_QUICK, answers),
  };
}

describe('キャラクターとプロンプト', () => {
  it('キャラクターの id は重複せず、カスタムは書いた性格を使う', () => {
    expect(new Set(PERSONAS.map((p) => p.id)).size).toBe(PERSONAS.length);
    expect(getPersona(CUSTOM_PERSONA_ID, '関西弁').style).toBe('関西弁');
    expect(getPersona('unknown').id).toBe(PERSONAS[0].id);
    expect(fillLine('「{type}」だね', { type: '職人' })).toBe('「職人」だね');
  });

  it('システムプロンプトにキャラクター・ルール・追加の指示が入る', () => {
    const text = buildSystemPrompt(
      { ...DEFAULT_SETTINGS, persona: 'mentor', extraInstructions: '短く' },
      { tools: true },
    );
    expect(text).toContain('ソラ先輩');
    expect(text).toContain('作り話をしない');
    expect(text).toContain('ツール');
    expect(text).toContain('短く');
  });

  it('2 人目は相棒と違う視点で一言だけ添える', () => {
    const text = buildSecondVoicePrompt(
      DEFAULT_SETTINGS,
      getPersona('analyst'),
      getPersona('partner'),
    );
    expect(text).toContain('リコ');
    expect(text).toContain('ハル');
    expect(text).toContain('1〜2 文');
  });
});

describe('チャットの履歴', () => {
  it('2 人目の一言とエラーはメインの履歴に入れず、アプリの状態は発話の前に付ける', () => {
    const h = toHistory([
      {
        id: 'u',
        role: 'user',
        text: 'こんにちは',
        context: '<app_state>{}</app_state>',
        createdAt: 1,
      },
      { id: 'a', role: 'assistant', text: 'やあ', createdAt: 2, status: 'done' },
      { id: 'b', role: 'assistant', text: '補足', createdAt: 3, aside: true, status: 'done' },
      { id: 'e', role: 'assistant', text: '', createdAt: 4, status: 'error' },
    ]);
    expect(h.map((t) => t.id)).toEqual(['u', 'a']);
    expect(h[0].text).toBe('<app_state>{}</app_state>\n\nこんにちは');
  });
});

describe('アプリの状態とツール', () => {
  beforeEach(async () => {
    await db.results.clear();
  });

  it('最新のビッグファイブを要約して渡す', async () => {
    await db.results.bulkAdd([result('a', 1, 3), result('b', 2, 5)]);
    const state = await buildAppState('chat');
    expect(state.assessments.count).toBe(2);
    expect(state.assessments.latestBigFive?.resultId).toBe('b');
    expect(state.assessments.latestBigFive?.domains).toHaveLength(5);
  });

  it('ツールは記録をプログラムで調べて返す', async () => {
    expect(await executeTool({ name: 'compare_assessments', arguments: {} })).toHaveProperty(
      'error',
    );
    await db.results.bulkAdd([result('a', 1, 3), result('b', 2, 5)]);
    const list = (await executeTool({ name: 'list_assessments', arguments: {} })) as unknown[];
    expect(list).toHaveLength(2);
    const facets = (await executeTool({
      name: 'get_facet_scores',
      arguments: { domain: 'E' },
    })) as { facets: unknown[] };
    expect(facets.facets).toHaveLength(6);
    const diff = (await executeTool({ name: 'compare_assessments', arguments: {} })) as {
      changes: unknown[];
    };
    expect(diff.changes.length).toBeGreaterThan(0);
    expect(await executeTool({ name: 'nope', arguments: {} })).toHaveProperty('error');
  });

  it('外部の AI 用のプロンプトに、アプリが計算した結果を JSON で入れる', () => {
    const r = result('a', 1, 4);
    const text = bigFiveDeepDivePrompt(r);
    expect(text).toContain(JSON.stringify(summarizeBigFive(r), null, 2));
  });
});
