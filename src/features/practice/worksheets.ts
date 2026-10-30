/** 改善トレーニング（ワークシート）の一覧 */
export const WORKSHEETS = [
  {
    kind: 'reframe' as const,
    title: '考え方の整理（リフレーミング）',
    summary: 'もやもやした出来事を書き出し、別の見方を探す',
    topicIds: ['cognitive-distortions', 'reframing'],
  },
  {
    kind: 'good-things' as const,
    title: '3 つのよいこと',
    summary: '今日あったよいことを 3 つ書く（寝る前に 3 分）',
    topicIds: ['emotion-labeling'],
  },
  {
    kind: 'if-then' as const,
    title: '小さな習慣プラン',
    summary: '「〜したら、〜する」の形で、明日からの一歩を決める',
    topicIds: ['small-habits'],
  },
];

export type WorksheetKind = (typeof WORKSHEETS)[number]['kind'];

/** 認知のゆがみ（考え方のくせ）の選択肢 */
export const DISTORTIONS = [
  '白黒思考',
  '一般化しすぎ',
  '心の読みすぎ',
  'すべき思考',
  '自分のせい思考',
  'マイナス化',
  '先読みの不安',
];
