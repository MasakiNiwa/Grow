import { scoreMap } from './scoring';
import { rankedValues } from './headline';
import type { AssessmentResult } from './types';

export interface ProfileLink {
  kind: 'match' | 'tension';
  title: string;
  text: string;
}

/**
 * 性格・興味・価値観の最新の結果の「つながり」を、決まったルールで見つける（プログラムが判断する）。
 * match: 互いに後押しし合う組み合わせ、tension: 葛藤しやすい組み合わせ（悪いことではなく、工夫のしどころ）
 */
export function profileLinks(
  bigfive?: AssessmentResult,
  riasec?: AssessmentResult,
  values?: AssessmentResult,
): ProfileLink[] {
  const b = bigfive ? scoreMap(bigfive.scores) : {};
  const r = riasec ? scoreMap(riasec.scores) : {};
  const topValues = values
    ? rankedValues(values.scores)
        .slice(0, 3)
        .map((v) => v.id)
    : [];
  const bottomValues = values
    ? rankedValues(values.scores)
        .slice(-3)
        .map((v) => v.id)
    : [];
  const hi = (m: Record<string, { pomp: number }>, id: string) => (m[id]?.pomp ?? 50) > 60;
  const lo = (m: Record<string, { pomp: number }>, id: string) => (m[id]?.pomp ?? 50) < 40;
  const links: ProfileLink[] = [];
  const add = (cond: boolean, link: ProfileLink) => cond && links.push(link);

  if (bigfive && riasec) {
    add(hi(b, 'E') && (hi(r, 'S') || hi(r, 'E')), {
      kind: 'match',
      title: '人と関わる力と興味が一致',
      text: '外向性が高く、人と関わる活動（社会的・企業的）にも興味があります。人の中で動く役割で、力とやる気の両方が出やすい組み合わせです。',
    });
    add(lo(b, 'E') && (hi(r, 'S') || hi(r, 'E')), {
      kind: 'tension',
      title: '人と関わりたい、でも充電は一人で',
      text: '人に関わる活動に興味がある一方で、エネルギーは一人の時間で回復するタイプです。少人数や 1 対 1 の関わり方、関わった後の休み時間を予定に入れると長続きします。',
    });
    add(hi(b, 'O') && (hi(r, 'A') || hi(r, 'I')), {
      kind: 'match',
      title: '好奇心が興味の中心に',
      text: '開放性が高く、研究的・芸術的な活動にも惹かれています。「なぜ？」や「新しい表現」を追える環境で、いちばん伸びやすいでしょう。',
    });
    add(hi(b, 'C') && hi(r, 'C'), {
      kind: 'match',
      title: 'きちんとする力が武器に',
      text: '誠実性が高く、整理・管理する活動にも興味があります。正確さや段取りが求められる場面で、周りから頼りにされやすい組み合わせです。',
    });
    add(lo(b, 'C') && hi(r, 'C'), {
      kind: 'tension',
      title: '整えたい気持ちと、柔軟なスタイル',
      text: '整理や管理に興味はあるものの、ふだんは柔軟に動くタイプです。チェックリストやテンプレートなどの「仕組み」に任せると、興味を活かしやすくなります。',
    });
    add(hi(b, 'A') && hi(r, 'S'), {
      kind: 'match',
      title: '思いやりが活きる',
      text: '協調性が高く、人を助ける活動に興味があります。相手の気持ちに寄り添う役割にぴったりですが、抱え込みすぎないよう境界線も意識しましょう。',
    });
  }

  if (bigfive && values) {
    add(hi(b, 'O') && topValues.some((v) => ['SD', 'ST'].includes(v)), {
      kind: 'match',
      title: '新しいもの好きと、自由を求める価値観',
      text: '開放性の高さと「自律」「刺激」を大切にする価値観がそろっています。自分で決められる裁量や、変化のある環境を選ぶと満足しやすいでしょう。',
    });
    add(hi(b, 'O') && topValues.some((v) => ['SE', 'TR', 'CO'].includes(v)), {
      kind: 'tension',
      title: '新しいことに惹かれつつ、安定も大事',
      text: '好奇心は強いけれど、安全や決まりも大切にしています。大きく変えるより「小さく試す」やり方なら、両方を満たせます。',
    });
    add(hi(b, 'A') && topValues.some((v) => ['AC', 'PO'].includes(v)), {
      kind: 'tension',
      title: '調和を大事にしつつ、成果も求める',
      text: '人との調和を重んじる性格と、達成・影響力を大切にする価値観の組み合わせです。「みんなで成果を出す」形の目標にすると、迷いが減ります。',
    });
    add(hi(b, 'C') && topValues.includes('AC'), {
      kind: 'match',
      title: 'やり抜く力と達成の価値観',
      text: '誠実性が高く、達成を大切にしています。目標を小さく区切って積み上げるやり方が、とても合っています。',
    });
    add(hi(b, 'N') && topValues.includes('SE'), {
      kind: 'match',
      title: '慎重さと安心の価値観',
      text: '心のゆれを感じやすく、安心できる環境を大切にしています。先の見通しを立てる・相談できる人を作るなど、安心の土台を整えると力を出しやすくなります。',
    });
  }

  if (riasec && values) {
    add(hi(r, 'S') && topValues.some((v) => ['BE', 'UN'].includes(v)), {
      kind: 'match',
      title: '人の役に立ちたい気持ちが一貫',
      text: '人を助ける活動への興味と、思いやり・公正を大切にする価値観が一致しています。誰かの役に立てている実感が、大きなやりがいになりそうです。',
    });
    add(hi(r, 'E') && bottomValues.some((v) => ['AC', 'PO'].includes(v)), {
      kind: 'tension',
      title: 'リードは好き、でも地位や成果にはこだわらない',
      text: '企画や人を動かすことには興味がある一方で、達成や影響力そのものはあまり重視していません。「何のためにリードするのか」という目的があると、力を出しやすくなります。',
    });
  }
  return links;
}
