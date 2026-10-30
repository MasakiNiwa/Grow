import { Chip } from '@/components/ui/Chip';
import { FAMILIES } from '@/features/assess/registry';
import { useReflectFamily } from './useResults';

/** 分析する診断のまとまり（性格・興味・価値観）を選ぶ */
export function FamilyPicker() {
  const family = useReflectFamily((s) => s.family);
  const set = useReflectFamily((s) => s.set);
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="分析する診断">
      {FAMILIES.map((f) => (
        <Chip key={f.id} active={family === f.id} onClick={() => set(f.id)}>
          {f.label}
        </Chip>
      ))}
    </div>
  );
}
