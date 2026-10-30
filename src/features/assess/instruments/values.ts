import type { Instrument, ItemDef, ScaleDef } from '../types';

/**
 * 価値観診断。シュワルツ（S. H. Schwartz）の基本的価値の理論（10 の価値と、4 つの上位のまとまり）の考え方にもとづき、
 * Grow が日本語で作成した設問（PVQ などの既存の尺度の設問は使っていない）。
 * 「人生で、どのくらい大切にしたいか」を 5 段階で答える。価値観に良い・悪いはない。
 * 快楽はシュワルツの理論では「変化への開放」と「自己高揚」の両方にまたがるが、ここでは「変化への開放」に入れる。
 */

type ValueSpec = [id: string, label: string, description: string, items: string[]];

const GROUPS: {
  id: string;
  label: string;
  description: string;
  low: string;
  high: string;
  values: ValueSpec[];
}[] = [
  {
    id: 'OPEN',
    label: '変化への開放',
    description: '自分で決め、新しいことや楽しさを求める',
    low: '安定を選ぶ',
    high: '変化を選ぶ',
    values: [
      [
        'SD',
        '自律',
        '自分で考え、自分で決めること',
        [
          '自分のやり方を自分で決められること',
          '人に頼らず、自分の考えを持つこと',
          '好奇心のままに学べること',
        ],
      ],
      [
        'ST',
        '刺激',
        'わくわくする体験や挑戦',
        [
          'いつもと違う、新しい体験をすること',
          '思い切った挑戦をすること',
          '変化の多い毎日を送ること',
        ],
      ],
      [
        'HE',
        '楽しさ',
        '人生を楽しみ、心地よく過ごすこと',
        [
          '自分が楽しいと思うことをする時間',
          'おいしいものや好きなことを味わうこと',
          '心地よく、のびのび過ごすこと',
        ],
      ],
    ],
  },
  {
    id: 'ENH',
    label: '自己高揚',
    description: '成果を上げ、認められ、影響力を持つ',
    low: '人のために',
    high: '自分の成功のために',
    values: [
      [
        'AC',
        '達成',
        '力を発揮し、成果を認められること',
        [
          '目標を達成して成果を出すこと',
          '自分の能力を人に認めてもらうこと',
          '人より上手にできるようになること',
        ],
      ],
      [
        'PO',
        '影響力',
        '人や物事を動かす立場や豊かさ',
        [
          '人をまとめ、動かす立場に立つこと',
          '経済的に豊かになること',
          '周りから一目置かれる存在になること',
        ],
      ],
    ],
  },
  {
    id: 'CON',
    label: '保守',
    description: '安全・決まり・伝統を大切にする',
    low: '自由を選ぶ',
    high: '安定を選ぶ',
    values: [
      [
        'SE',
        '安全',
        '安心して暮らせる安定した環境',
        [
          '安心して暮らせる、安定した生活',
          '健康で、危険のない毎日',
          '家族や身近な人が安全であること',
        ],
      ],
      [
        'CO',
        '調和',
        '決まりを守り、周りと波風を立てないこと',
        ['周りに迷惑をかけないこと', '約束やルールを守ること', '目上の人や周りの期待に応えること'],
      ],
      [
        'TR',
        '伝統',
        '受け継がれてきた習慣や考えを大切にすること',
        [
          '昔から続く習慣や行事を大切にすること',
          '控えめに、身の丈に合った暮らしをすること',
          '家族や地域で受け継がれてきた考えを守ること',
        ],
      ],
    ],
  },
  {
    id: 'TRA',
    label: '自己超越',
    description: '身近な人や社会・自然のために',
    low: '自分のために',
    high: '人や社会のために',
    values: [
      [
        'BE',
        '思いやり',
        '身近な人の幸せのために尽くすこと',
        ['身近な人の役に立つこと', '友人や仲間に誠実であること', '大切な人を支え、助けること'],
      ],
      [
        'UN',
        '公正',
        'すべての人や自然を大切にすること',
        [
          '誰もが公平に扱われること',
          '自分と違う考えの人も理解しようとすること',
          '自然や環境を守ること',
        ],
      ],
    ],
  },
];

const scales: ScaleDef[] = GROUPS.flatMap((g) => [
  { id: g.id, label: g.label, description: g.description, lowLabel: g.low, highLabel: g.high },
  ...g.values.map(([id, label, description]) => ({
    id,
    label,
    description,
    lowLabel: 'あまり重視しない',
    highLabel: 'とても大切',
    parent: g.id,
  })),
]);

const items: ItemDef[] = GROUPS.flatMap((g) =>
  g.values.flatMap(([id, , , texts]) =>
    texts.map((text, i) => ({
      id: `${id.toLowerCase()}-${i + 1}`,
      text,
      scale: id,
      keyed: 1 as const,
    })),
  ),
);

export const VALUES: Instrument = {
  id: 'values-30',
  version: 1,
  category: 'values',
  title: '価値観診断',
  summary: '30 問で、人生で大切にしたいこと（10 の価値・4 つのまとまり）を見る',
  intro:
    'それぞれが、あなたの人生でどのくらい大切かを答えてください。どれも大切に思えるときは、その中でも「特に」大切なものに高い点を付けると、違いが分かりやすくなります。',
  minutes: 5,
  options: [
    { value: 1, label: 'ほとんど大切でない', short: '大切でない' },
    { value: 2, label: 'あまり大切でない', short: 'やや' },
    { value: 3, label: 'まあ大切', short: 'まあ' },
    { value: 4, label: 'かなり大切', short: 'かなり' },
    { value: 5, label: 'とても大切', short: 'とても' },
  ],
  scales,
  items,
  source:
    'シュワルツ（S. H. Schwartz）の基本的価値の理論の考え方にもとづき、Grow が日本語で作成（既存の尺度の設問は使っていない・未検証の目安）',
};

export const VALUE_IDS = GROUPS.flatMap((g) => g.values.map((v) => v[0]));
export const VALUE_GROUP_IDS = GROUPS.map((g) => g.id);
