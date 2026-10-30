import { ComingSoon } from './ComingSoonPage';

export default function LearnPage() {
  return (
    <ComingSoon
      title="学ぶ"
      lead="社会で生きていくための考え方を、カードとクイズで学びます。"
      plans={[
        {
          title: '考え方カード',
          body: 'アサーション・傾聴・認知の偏り・リフレーミングなどを短く学ぶ',
        },
        { title: '確認クイズと復習', body: '忘れかけたころに復習（間隔反復）' },
        {
          title: '外部の AI で教材を作る',
          body: 'プロンプトをコピーして外部の AI に作ってもらい、取り込む',
        },
      ]}
    />
  );
}
