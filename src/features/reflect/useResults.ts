import { create } from 'zustand';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/db';
import { scaleFamily } from '@/features/assess/registry';

/** 選んでいる診断のまとまり（ツールを切り替えても同じまとまりのまま） */
export const useReflectFamily = create<{ family: string; set: (f: string) => void }>()((set) => ({
  family: 'bigfive',
  set: (family) => set({ family }),
}));

/** そのまとまりの結果（古い順） */
export function useFamilyResults(family: string) {
  return useLiveQuery(
    async () =>
      (await db.results.orderBy('createdAt').toArray()).filter(
        (r) => scaleFamily(r.instrumentId) === family,
      ),
    [family],
  );
}
