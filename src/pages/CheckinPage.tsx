import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation, useSearch } from 'wouter';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ClearButton } from '@/components/ui/ClearButton';
import { Switch } from '@/components/ui/Switch';
import { db } from '@/lib/db/db';
import { cn } from '@/lib/utils/cn';
import { errorMessage } from '@/lib/utils/format';
import { pick } from '@/features/ai/personas';
import { useMainPersona } from '@/features/ai/usePersona';
import { deleteCheckin, saveCheckin } from '@/features/checkin/checkinData';
import { DEFAULT_TAGS, MOOD_FACES, localDate } from '@/features/checkin/types';
import { useSettings } from '@/features/settings/settingsStore';

function Scale({
  label,
  low,
  high,
  value,
  onChange,
  faces,
}: {
  label: string;
  low: string;
  high: string;
  value: number;
  onChange: (v: number) => void;
  faces?: string[];
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={value === v}
            onClick={() => onChange(v)}
            className={cn(
              'h-11 rounded-xl border text-sm transition-colors',
              faces && 'text-2xl',
              value === v
                ? 'border-accent-500 bg-accent-50 font-semibold dark:bg-accent-900/40'
                : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800',
            )}
          >
            {faces ? faces[v - 1] : v}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[0.7rem] text-slate-500">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </fieldset>
  );
}

const THANKS = ['記録したよ。今日もおつかれさま', 'ありがとう。続けると、自分の波が見えてくるよ'];

function Form({ initialMood }: { initialMood: number }) {
  const [, navigate] = useLocation();
  const persona = useMainPersona();
  const s = useSettings();
  const [mood, setMood] = useState(initialMood);
  const [energy, setEnergy] = useState(3);
  const [stress, setStress] = useState(3);
  const [sleep, setSleep] = useState(7);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [note, setNote] = useState('');
  const allTags = [...DEFAULT_TAGS, ...s.checkinTags];

  const addTag = () => {
    const t = newTag.trim().slice(0, 12);
    if (!t) return;
    if (!allTags.includes(t)) s.update({ checkinTags: [...s.checkinTags, t] });
    if (!tags.includes(t)) setTags([...tags, t]);
    setNewTag('');
  };

  const save = async () => {
    try {
      await saveCheckin({
        mood,
        energy,
        stress,
        sleep: s.checkinSleep ? sleep : undefined,
        tags,
        note: note.trim() || undefined,
      });
      toast.success(`${persona.emoji} ${pick(THANKS)}`);
      navigate('/reflect/condition');
    } catch (e) {
      toast.error('記録できませんでした', { description: errorMessage(e) });
    }
  };

  return (
    <Card className="space-y-5 p-4">
      <Scale
        label="気分"
        low="しんどい"
        high="とても良い"
        value={mood}
        onChange={setMood}
        faces={MOOD_FACES}
      />
      <Scale
        label="エネルギー"
        low="ぐったり"
        high="元気いっぱい"
        value={energy}
        onChange={setEnergy}
      />
      <Scale
        label="ストレス"
        low="ほとんどない"
        high="とても強い"
        value={stress}
        onChange={setStress}
      />
      <div className="space-y-1.5">
        <div className="flex items-center gap-3">
          <span className="flex-1 text-sm font-medium">睡眠時間</span>
          <Switch
            checked={s.checkinSleep}
            onChange={(v) => s.update({ checkinSleep: v })}
            label="睡眠時間を記録する"
          />
        </div>
        {s.checkinSleep && (
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={14}
              step={0.5}
              value={sleep}
              onChange={(e) => setSleep(Number(e.target.value))}
              aria-label="睡眠時間"
              className="h-2 flex-1 accent-accent-600"
            />
            <span className="w-16 text-right font-mono text-sm">{sleep} 時間</span>
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="text-sm font-medium">今日のできごと（いくつでも）</div>
        <div className="flex flex-wrap gap-1.5">
          {allTags.map((t) => (
            <Chip
              key={t}
              active={tags.includes(t)}
              onClick={() => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])}
            >
              {t}
            </Chip>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addTag();
          }}
        >
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="タグを追加"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <Button type="submit" size="sm" disabled={!newTag.trim()}>
            <Plus />
            追加
          </Button>
        </form>
      </div>
      <div className="space-y-1.5">
        <div className="text-sm font-medium">ひとことメモ（任意）</div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
      </div>
      <div className="flex justify-end">
        <Button variant="primary" onClick={() => void save()}>
          <Save />
          記録する
        </Button>
      </div>
    </Card>
  );
}

/** 日々のチェックイン（1 日に何度でも記録できる。分析では日ごとの平均） */
export default function CheckinPage() {
  const search = useSearch();
  const initialMood = Number(new URLSearchParams(search).get('mood')) || 3;
  const [key, setKey] = useState(0);
  const [today] = useState(() => localDate(Date.now()));
  const todays = useLiveQuery(() => db.checkins.where('date').equals(today).toArray(), [today]);
  return (
    <>
      <PageHeader
        title="今日のチェックイン"
        back="/reflect/condition"
        actions={<ClearButton onClear={() => setKey((k) => k + 1)} />}
      />
      <PageBody>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          1
          分でできる、今日の自分の記録です。続けると「ふりかえる」で、気分の波や、何が調子に影響しているかが見えてきます。
        </p>
        <Form key={key} initialMood={initialMood} />
        {todays && todays.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-500">今日の記録</h2>
            <Card className="divide-y divide-slate-100 dark:divide-slate-800">
              {todays.map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="text-xl">{MOOD_FACES[c.mood - 1]}</span>
                  <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-400">
                    {new Date(c.createdAt).toTimeString().slice(0, 5)}・エネルギー {c.energy}
                    ・ストレス {c.stress}
                    {c.tags.length > 0 && `・${c.tags.join('・')}`}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="削除"
                    onClick={() => void deleteCheckin(c.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </Card>
          </section>
        )}
      </PageBody>
    </>
  );
}
