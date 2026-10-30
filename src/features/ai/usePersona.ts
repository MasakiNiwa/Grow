import { useShallow } from 'zustand/react/shallow';
import { useSettings, type Settings } from '@/features/settings/settingsStore';
import { getPersona, type CustomPersonaFields, type Persona } from './personas';

/** カスタムのキャラクターの設定（中身が変わったときだけ描き直すよう、平らなオブジェクトで選ぶ） */
const customFields = (s: Settings): CustomPersonaFields => ({
  customPersona: s.customPersona,
  customName: s.customName,
  customEmoji: s.customEmoji,
  secondCustomPersona: s.secondCustomPersona,
  secondCustomName: s.secondCustomName,
  secondCustomEmoji: s.secondCustomEmoji,
});

/** 相棒（メインのキャラクター） */
export function useMainPersona(): Persona {
  const id = useSettings((s) => s.persona);
  const c = useSettings(useShallow(customFields));
  return getPersona(id, c);
}

/** id からキャラクター（カスタムの設定も反映） */
export function usePersonaById(id: string | undefined): Persona {
  const c = useSettings(useShallow(customFields));
  return getPersona(id ?? 'partner', c);
}
