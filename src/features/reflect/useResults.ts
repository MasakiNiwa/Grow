import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/db';
import { scaleFamily } from '@/features/assess/registry';

/** ビッグファイブの結果（古い順） */
export function useBigFiveResults() {
  return useLiveQuery(
    async () =>
      (await db.results.orderBy('createdAt').toArray()).filter(
        (r) => scaleFamily(r.instrumentId) === 'bigfive',
      ),
    [],
  );
}
