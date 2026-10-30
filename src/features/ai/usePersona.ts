import { useShallow } from 'zustand/react/shallow';
import { useSettings } from '@/features/settings/settingsStore';
import { getPersona, type Persona } from './personas';

const customFields = (s: ReturnType<typeof useSettings.getState>) => ({
  customPersona: s.customPersona,
  customName: s.customName,
  customEmoji: s.customEmoji,
  secondCustomPersona: s.secondCustomPersona,
  secondCustomName: s.secondCustomName,
  secondCustomEmoji: s.secondCustomEmoji,
});

/** 相棒（メインのキャラクター） */
export function useMainPersona(): Persona {
  const [id, c] = useSettings(useShallow((s) => [s.persona, customFields(s)] as const));
  return getPersona(id, c);
}

/** id からキャラクター（カスタムの設定も反映） */
export function usePersonaById(id: string | undefined): Persona {
  const c = useSettings(useShallow(customFields));
  return getPersona(id ?? 'partner', c);
}

/** 画面の外（ストアなど）で使う */
export function personaFromSettings(id: string): Persona {
  return getPersona(id, useSettings.getState());
}
