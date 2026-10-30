import { db } from '@/lib/db/db';
import { analysis } from '@/lib/analysis/client';
import { createId } from '@/lib/utils/id';
import type { AssessmentDraft, AssessmentResult, Instrument } from './types';

/** 設問の順番を混ぜる（同じ側面が続かないよう、全体をシャッフル） */
export function shuffled<T>(list: T[], random = Math.random): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 途中の回答を読む。無い・診断の版が変わったなら新しく始める */
export async function loadOrStartDraft(inst: Instrument): Promise<AssessmentDraft> {
  const draft = await db.drafts.get(inst.id);
  if (draft && draft.instrumentVersion === inst.version) return draft;
  return startDraft(inst);
}

export async function startDraft(inst: Instrument): Promise<AssessmentDraft> {
  const now = Date.now();
  const draft: AssessmentDraft = {
    instrumentId: inst.id,
    instrumentVersion: inst.version,
    answers: {},
    order: shuffled(inst.items.map((i) => i.id)),
    startedAt: now,
    updatedAt: now,
  };
  await db.drafts.put(draft);
  return draft;
}

export async function saveDraft(draft: AssessmentDraft): Promise<void> {
  await db.drafts.put({ ...draft, updatedAt: Date.now() });
}

export async function discardDraft(instrumentId: string): Promise<void> {
  await db.drafts.delete(instrumentId);
}

/** 回答を採点して結果を保存し、途中の回答を消す。保存した結果を返す */
export async function finishDraft(
  inst: Instrument,
  draft: AssessmentDraft,
): Promise<AssessmentResult> {
  const scores = await analysis().score(inst.id, draft.answers);
  const result: AssessmentResult = {
    id: createId(),
    instrumentId: inst.id,
    instrumentVersion: inst.version,
    createdAt: Date.now(),
    durationMs: Date.now() - draft.startedAt,
    answers: draft.answers,
    scores,
  };
  await db.transaction('rw', db.results, db.drafts, async () => {
    await db.results.add(result);
    await db.drafts.delete(inst.id);
  });
  return result;
}

export async function deleteResult(id: string): Promise<void> {
  await db.results.delete(id);
}

export async function updateResultNote(id: string, note: string): Promise<void> {
  await db.results.update(id, { note });
}
