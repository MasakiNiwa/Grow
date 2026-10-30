import { Field } from '@/components/ui/Field';
import { TaskRow } from '@/features/cloud/TaskModels';
import { useSettings, type Settings } from '@/features/settings/settingsStore';
import { PersonaPicker } from './PersonaPicker';
import { CUSTOM2_PERSONA_ID, CUSTOM_PERSONA_ID, getPersona } from './personas';

const boxClass =
  'rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900';
const inputClass = `w-full ${boxClass}`;

/** カスタムのキャラクターの名前・絵文字・性格 */
function CustomEditor({
  keys,
  placeholder,
}: {
  keys: { name: keyof Settings; emoji: keyof Settings; style: keyof Settings };
  placeholder: string;
}) {
  const s = useSettings();
  const value = (k: keyof Settings) => String(s[k] ?? '');
  return (
    <div className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
      <div className="flex gap-2">
        <input
          value={value(keys.emoji)}
          onChange={(e) => s.update({ [keys.emoji]: e.target.value.slice(0, 4) })}
          placeholder="🙂"
          aria-label="絵文字"
          className={`${boxClass} w-16 shrink-0 text-center`}
        />
        <input
          value={value(keys.name)}
          onChange={(e) => s.update({ [keys.name]: e.target.value.slice(0, 20) })}
          placeholder="名前"
          aria-label="名前"
          className={`${boxClass} min-w-0 flex-1`}
        />
      </div>
      <textarea
        value={value(keys.style)}
        onChange={(e) => s.update({ [keys.style]: e.target.value })}
        rows={3}
        placeholder={placeholder}
        aria-label="性格・話し方"
        className={inputClass}
      />
    </div>
  );
}

/** 設定: 相棒と 2 人目のキャラクター（それぞれカスタム可・使う AI も別々に選べる） */
export function CharacterSettings() {
  const s = useSettings();
  const custom1 = getPersona(CUSTOM_PERSONA_ID, s);
  const custom2 = getPersona(CUSTOM2_PERSONA_ID, s);
  return (
    <>
      <Field label="相棒（メインのキャラクター）" stacked>
        <PersonaPicker
          value={s.persona}
          onChange={(v) =>
            s.update({ persona: v, ...(v === s.secondPersona ? { secondPersona: '' } : {}) })
          }
          custom={{ ...custom1, tagline: '名前と性格を自分で決める' }}
        />
        {s.persona === CUSTOM_PERSONA_ID && (
          <CustomEditor
            keys={{ name: 'customName', emoji: 'customEmoji', style: 'customPersona' }}
            placeholder="性格・口調・話し方（例: 関西弁で話す、明るくて面倒見のいい先輩）"
          />
        )}
        <ul>
          <TaskRow task="chat" label="相棒が使う AI" hint="決めていなければ、いつもの AI" />
        </ul>
      </Field>
      <Field
        label="2 人目のキャラクター"
        hint="チャットで相棒が答えたあと、別の視点から 1〜2 文を添えます（AI の生成が 1 回増えます）"
        stacked
      >
        <PersonaPicker
          value={s.secondPersona}
          onChange={(v) => s.update({ secondPersona: v })}
          allowNone
          exclude={s.persona}
          custom={{ ...custom2, tagline: '名前と性格を自分で決める' }}
        />
        {s.secondPersona === CUSTOM2_PERSONA_ID && (
          <CustomEditor
            keys={{
              name: 'secondCustomName',
              emoji: 'secondCustomEmoji',
              style: 'secondCustomPersona',
            }}
            placeholder="性格・口調・話し方（例: 皮肉屋だけど根はやさしい、ツッコミ役の同期）"
          />
        )}
        {s.secondPersona && (
          <>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>
                掛け合いの長さ
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  相棒の答えのあと、2 人が交互に話す回数
                </span>
              </span>
              <select
                value={s.banterTurns}
                onChange={(e) => s.update({ banterTurns: Number(e.target.value) })}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <option value={1}>一言だけ</option>
                <option value={2}>一言＋相棒が返す</option>
                <option value={3}>2 往復</option>
                <option value={5}>3 往復</option>
              </select>
            </label>
            <ul>
              <TaskRow
                task="aside"
                label="2 人目が使う AI"
                hint="相棒と別のモデル（別の会社の AI など）にすると、考え方や話し方に本当の個性が出ます"
              />
            </ul>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              端末内の AI は同時に 1 つのモデルしか読み込めないため、2 人とも端末内の AI
              のときは同じモデルが話します。別々のモデルにするには、どちらか（または両方）をクラウド
              AI にしてください。
            </p>
          </>
        )}
      </Field>
    </>
  );
}
