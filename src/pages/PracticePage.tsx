import { ComingSoon } from './ComingSoonPage';

export default function PracticePage() {
  return (
    <ComingSoon
      title="練習"
      lead="学んだ考え方を、ロールプレイとトレーニングで身につけます。"
      plans={[
        {
          title: '場面ロールプレイ',
          body: '断る・謝る・報告する・意見を言うなどの場面を、選択肢で練習（AI があれば自由会話も）',
        },
        {
          title: '改善トレーニング',
          body: '考え方の整理（リフレーミング）・3 つのよいこと・小さな習慣づくりのワークシート',
        },
      ]}
    />
  );
}
