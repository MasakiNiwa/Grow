import { useState } from 'react';
import { Select } from '@/components/ui/Select';
import { formatDateTime } from '@/lib/utils/format';
import { getInstrument } from '@/features/assess/registry';
import { ScaleDrilldown } from '@/features/assess/components/ScaleDrilldown';
import { EmptyResults } from './EmptyResults';
import { FamilyPicker } from './FamilyPicker';
import { useFamilyResults, useReflectFamily } from './useResults';

/** ドリルダウン: 結果を選んで、特性 → 側面 → 設問まで */
export default function DrillTool() {
  const family = useReflectFamily((s) => s.family);
  const results = useFamilyResults(family);
  const [id, setId] = useState('');
  if (!results) return null;
  if (results.length === 0)
    return (
      <div className="space-y-3">
        <FamilyPicker />
        <EmptyResults />
      </div>
    );
  const result = results.find((r) => r.id === id) ?? results.at(-1)!;
  const inst = getInstrument(result.instrumentId)!;
  return (
    <div className="space-y-3">
      <FamilyPicker />
      <Select
        value={result.id}
        options={[...results].reverse().map((r) => ({
          value: r.id,
          label: `${formatDateTime(r.createdAt)}（${getInstrument(r.instrumentId)?.items.length ?? ''} 問）`,
        }))}
        onChange={setId}
      />
      <ScaleDrilldown key={result.id} inst={inst} result={result} />
    </div>
  );
}
