import type { Instrument, InstrumentCategory } from './types';
import { BIG_FIVE_FULL, BIG_FIVE_QUICK } from './instruments/bigfive';
import { RIASEC } from './instruments/riasec';
import { VALUES } from './instruments/values';

/**
 * 診断の登録先。診断を増やすときはここに足すだけで、一覧・回答・採点・記録・分析に出る。
 * （Worker からも読み込むので、React に依存するものは置かない）
 */
export const INSTRUMENTS: Instrument[] = [BIG_FIVE_QUICK, BIG_FIVE_FULL, RIASEC, VALUES];

const byId = new Map(INSTRUMENTS.map((i) => [i.id, i]));

export function getInstrument(id: string): Instrument | undefined {
  return byId.get(id);
}

export const CATEGORY_LABELS: Record<InstrumentCategory, string> = {
  personality: '性格',
  aptitude: '適性・興味',
  values: '価値観',
  cognitive: '認知のくせ',
};

/** 同じ尺度を使う診断のまとまり（推移の比較に使う。クイック版とじっくり版は同じ尺度） */
export function scaleFamily(instrumentId: string): string {
  return instrumentId.startsWith('bigfive') ? 'bigfive' : instrumentId;
}

/**
 * 尺度のまとまり（分析で選ぶ単位）。instrument は尺度の定義の代表（クイック版とじっくり版は同じ尺度なので、じっくり版）
 */
export const FAMILIES: { id: string; label: string; instrument: Instrument }[] = [
  { id: 'bigfive', label: '性格', instrument: BIG_FIVE_FULL },
  { id: RIASEC.id, label: '興味', instrument: RIASEC },
  { id: VALUES.id, label: '価値観', instrument: VALUES },
];

export function familyInstrument(family: string): Instrument {
  return (FAMILIES.find((f) => f.id === family) ?? FAMILIES[0]).instrument;
}
