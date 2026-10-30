import type { ReactNode } from 'react';
import {
  BookOpen,
  ExternalLink,
  Info,
  MonitorCheck,
  Scale,
  ShieldCheck,
  Shapes,
  Sparkles,
  Stethoscope,
  Bot,
  Cpu,
} from 'lucide-react';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { PILLAR_ITEMS } from '@/app/navItems';
import { Card, Section } from '@/components/ui/Card';
import {
  APP_TAGLINE,
  APP_TITLE,
  LITERTLM_DOCS_URL,
  LITERTLM_URL,
  REPOSITORY_URL,
  SHARED_MODEL_SITES,
} from '@/lib/constants';
import { ModelStatusChip } from '@/features/engine/ModelStatusChip';
import { PERSONAS } from '@/features/ai/personas';
import { CapabilityCheck } from '@/features/help/CapabilityCheck';
import { LicenseList } from '@/features/help/LicenseList';
import { ALL_GROW_TYPES, TYPE_AXES } from '@/features/assess/instruments/bigfiveTypes';
import { INSTRUMENTS } from '@/features/assess/registry';

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-accent-700 underline-offset-2 hover:underline dark:text-accent-300"
    >
      {children}
      <ExternalLink className="size-3.5 shrink-0" />
    </a>
  );
}

function Body({ children }: { children: ReactNode }) {
  return <div className="space-y-2 px-4 py-3.5 text-sm leading-relaxed sm:px-5">{children}</div>;
}

/** 診断の出典（重複を除く） */
const SOURCES = [...new Set(INSTRUMENTS.map((i) => i.source))];

/**
 * ヘルプ。トップにバージョンなどの情報、その下は見出しごとに折りたたみ（既定はすべて閉じる）。
 */
export default function HelpPage() {
  return (
    <>
      <PageHeader title="ヘルプ" />
      <PageBody>
        <Card className="space-y-3 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <img src="./favicon.svg" alt="" className="size-12" />
            <div className="min-w-0">
              <h2 className="text-lg font-bold">{APP_TITLE}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{APP_TAGLINE}</p>
            </div>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-slate-500 dark:text-slate-400">バージョン</dt>
            <dd className="font-mono">v{__APP_VERSION__}</dd>
            <dt className="text-slate-500 dark:text-slate-400">ビルド日</dt>
            <dd className="font-mono">{__BUILD_DATE__}</dd>
            <dt className="text-slate-500 dark:text-slate-400">推論エンジン</dt>
            <dd className="font-mono">LiteRT-LM {__LITERTLM_VERSION__}</dd>
            <dt className="text-slate-500 dark:text-slate-400">AI</dt>
            <dd>
              <ModelStatusChip className="max-w-56" />
            </dd>
            <dt className="text-slate-500 dark:text-slate-400">ライセンス</dt>
            <dd>MIT License</dd>
            <dt className="text-slate-500 dark:text-slate-400">ソースコード</dt>
            <dd className="min-w-0 truncate">
              <ExtLink href={REPOSITORY_URL}>GitHub リポジトリ</ExtLink>
            </dd>
          </dl>
        </Card>

        <Section collapsible title="このアプリについて" icon={<Info />}>
          <Body>
            <p>
              <strong>Grow（人間改善プログラム）</strong>
              は、自分の傾向を知り、社会で生きていくための考え方を学び、練習して、ふりかえる——
              その繰り返しで少しずつ成長していくためのアプリです。
            </p>
            <p>
              採点・タイプ分け・集計などの判断はプログラムが行います。AI
              は、その結果をもとにリアクション・解説・相談相手を担当します。AI
              がなくても、すべての基本機能を使えます。
            </p>
          </Body>
        </Section>

        <Section collapsible title="使い方" icon={<BookOpen />}>
          <Body>
            <ol className="list-decimal space-y-1.5 pl-5">
              {PILLAR_ITEMS.map((p) => (
                <li key={p.to}>
                  <strong>{p.label}</strong>：{p.description}
                </li>
              ))}
            </ol>
            <p>
              画面右上の <strong>消しゴムのボタン（クリア）</strong>
              は、その画面の入力や進行中の内容をリセットします（診断なら、途中の回答を消して最初から）。アプリのデータ全体を消すときは「設定
              → データ」を使います。
            </p>
            <p>診断の途中でページを離れても、回答は自動で保存され、続きから再開できます。</p>
          </Body>
        </Section>

        <Section collapsible title="診断の結果の見方" icon={<Stethoscope />}>
          <Body>
            <p>
              得点は 0〜100
              で表します。設問への回答の平均を、取りうる範囲のどの位置にあるかに直したもの（POMP）で、
              <strong>人と比べた順位（偏差値）ではありません</strong>。40 未満を「低め」、60
              を超えると「高め」としています。
            </p>
            <p>
              結果のグラフは、棒を押すと「特性 → 側面 →
              設問ごとの回答」と掘り下げられます。「逆」と付いた設問は、当てはまるほどその側面の得点が下がる設問です。
            </p>
            <p>
              同じ選択肢ばかり・「どちらともいえない」が多い・回答がとても速い場合は、結果の画面で注意を表示します。
            </p>
            <p className="text-slate-500 dark:text-slate-400">
              この診断は自己理解のための目安で、医学的・心理学的な診断ではありません。心身の不調が続くときは、専門の窓口に相談してください。
            </p>
          </Body>
        </Section>

        <Section collapsible title="Grow タイプ（16 タイプ）" icon={<Shapes />}>
          <Body>
            <p>
              ビッグファイブのうち 4 つの特性の高低で 16 タイプに分け、情緒の敏感さを「安定 /
              繊細」として添えています。 軸：
              {TYPE_AXES.map((a) => `${a.high} / ${a.low}`).join('、')}
            </p>
            <ul className="grid gap-1 sm:grid-cols-2">
              {ALL_GROW_TYPES.map((t) => (
                <li
                  key={t.bits}
                  className="rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-slate-800/50"
                >
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{t.catchphrase}</div>
                </li>
              ))}
            </ul>
          </Body>
        </Section>

        <Section collapsible title="AI のキャラクター" icon={<Bot />}>
          <Body>
            <p>
              「設定 → AI のキャラクター」で、相棒（メインのキャラクター）と、別の視点から一言添える
              2 人目を選べます。性格を自分で書く「カスタム」もあります。
            </p>
            <ul className="space-y-1">
              {PERSONAS.map((p) => (
                <li key={p.id}>
                  {p.emoji} <strong>{p.name}</strong>：{p.tagline}
                </li>
              ))}
            </ul>
            <p>
              AI には、最新の診断の結果の要約（タイプ・5
              特性の得点など）を構造化データ（JSON）で伝え、必要なときは AI
              がツールで記録を調べてから答えます。数字はアプリが計算したものだけを使い、AI
              に計算させません。
            </p>
            <p>
              結果の画面の「外部の AI 用にコピー」は、ChatGPT・Claude・Gemini などの高性能な AI
              にそのまま貼り付けて、詳しい解説を頼むためのプロンプトです。
            </p>
          </Body>
        </Section>

        <Section collapsible title="AI の使い方（クラウド AI・端末内の AI）" icon={<Cpu />}>
          <Body>
            <p>
              <strong>クラウド AI</strong>：Gemini・OpenAI・Claude・OpenRouter の API キーを「AI
              の設定」で登録します。キーは 1 つの<strong>合言葉</strong>
              で暗号化してこの端末に保存され、起動後に一度合言葉を入れると、すべてのキーが使えるようになります。通信先は
              API のアドレスだけに限定しています。
            </p>
            <p>
              <strong>端末内の AI</strong>：Google の{' '}
              <ExtLink href={LITERTLM_URL}>LiteRT-LM</ExtLink> で、Gemma 4（Web
              版）などのモデルをブラウザの中で動かします（WebGPU に対応した Chrome / Edge
              推奨）。会話は端末の外に出ません。
            </p>
            <p>
              モデルは、同じ github.io の他のサイト（
              {SHARED_MODEL_SITES.map((x) => x.name).join('・')}
              ）と共通の保存領域に保存され、どのサイトで保存したモデルも使えます。端末のファイルとして書き出して（バックアップ）、あとから取り込むこともできます。
            </p>
            <p>
              「場面ごとの
              AI」で、ひとこと・解説・チャット・ロールプレイ・分析へのコメントごとに使う AI
              を変えられます（ひとことは軽いモデル、解説は賢いモデル、など）。
            </p>
            <p>
              詳しくは <ExtLink href={LITERTLM_DOCS_URL}>LiteRT-LM のドキュメント</ExtLink>{' '}
              を参照してください。WebGPU が使えないときは、chrome://gpu で GPU
              アクセラレーションが有効か確かめてください。
            </p>
          </Body>
        </Section>

        <Section collapsible title="データとプライバシー" icon={<ShieldCheck />}>
          <Body>
            <p>
              診断の結果や記録は、すべて<strong>この端末のブラウザ内</strong>
              （IndexedDB）に保存され、外部には送信されません。
            </p>
            <p>
              ブラウザのデータを消すと記録も消えるので、ときどき「設定 → データ →
              バックアップ」で書き出しておくと安心です。
            </p>
            <p>
              今後追加するクラウド AI の機能では、送る内容を説明して同意をいただいたうえで、選んだ
              AI サービスにだけ送信します。
            </p>
          </Body>
        </Section>

        <Section collapsible title="これからの予定" icon={<Sparkles />}>
          <Body>
            <ul className="list-disc space-y-1 pl-5">
              <li>学ぶ：考え方カード・クイズ・復習</li>
              <li>練習：場面ロールプレイ・改善トレーニング</li>
              <li>適性・興味（RIASEC）・価値観・認知のくせの診断</li>
            </ul>
          </Body>
        </Section>

        <Section collapsible title="動作環境" icon={<MonitorCheck />}>
          <Body>
            <p>
              最新の Chrome / Edge / Safari / Firefox
              で動きます（スマホ・PC）。ホーム画面に追加すると、アプリのように起動でき、オフラインでも使えます。
            </p>
          </Body>
          <CapabilityCheck />
        </Section>

        <Section collapsible title="クレジットとライセンス" icon={<Scale />}>
          <Body>
            <p>
              Grow は <strong>MIT License</strong> で公開しています（
              <ExtLink href={`${REPOSITORY_URL}/blob/main/LICENSE`}>LICENSE</ExtLink>）。
            </p>
            <p className="font-semibold">診断の出典</p>
            <ul className="list-disc space-y-1 pl-5">
              {SOURCES.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <p className="font-semibold">AI モデル</p>
            <p>
              AI
              モデルはアプリに含まれていません（ユーザーが入手します）。各モデルには、それぞれの利用規約・ライセンス（Gemma
              Terms of Use など）が適用されます。
            </p>
            <p className="font-semibold">利用しているオープンソースソフトウェア</p>
            <p className="text-slate-500 dark:text-slate-400">
              名前を押すとライセンスの全文を表示します（
              <ExtLink href={`${REPOSITORY_URL}/blob/main/THIRD_PARTY_NOTICES.md`}>
                THIRD_PARTY_NOTICES.md
              </ExtLink>
              ）。
            </p>
          </Body>
          <LicenseList />
        </Section>
      </PageBody>
    </>
  );
}
