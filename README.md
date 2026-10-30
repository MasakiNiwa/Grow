# Grow

**人間改善プログラム** — 自分の傾向を知り、社会で生きていくための考え方を学び、練習して、ふりかえる。

🌐 **公開ページ**: https://masakiniwa.github.io/Grow/

## コンセプト

「知る → 学ぶ → 練習する → ふりかえる」の 4 つの柱を繰り返して、少しずつ成長していくためのアプリです。

| 柱            | 内容                                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| 🧭 知る       | 性格（ビッグファイブ）・適性の診断。結果は Grow タイプ（16 タイプ）と、特性 → 側面 → 設問のドリルダウンで |
| 📚 学ぶ       | 社会で生きていくための考え方（準備中）                                                                    |
| 🏋️ 練習       | ロールプレイと改善トレーニング（準備中）                                                                  |
| 📈 ふりかえる | 分析ツール（推移・2 回を比べる・ドリルダウン）。ツールは追加していける                                    |

- 採点・タイプ分け・集計はプログラムが行い、AI はその上に乗る設計です（AI 連携は今後追加。AI がなくても使えます）
- データはすべて端末のブラウザ内（IndexedDB）。バックアップの書き出し・復元ができます
- スマホ / PC 両対応（スマホは下部ナビ）、落ち着いたダークモード、PWA（オフライン起動）

> 診断は自己理解のための目安で、医学的・心理学的な診断ではありません。

## 開発

```bash
npm install
npm run dev        # 開発サーバー
npm run build      # 本番ビルド（dist/）
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm test           # Vitest
npm run format     # Prettier
npm run licenses   # サードパーティのライセンス一覧（THIRD_PARTY_NOTICES.md）の生成
```

`main` ブランチへの push で GitHub Actions が GitHub Pages にデプロイします。
設計と拡張のしかたは [docs/SPEC.md](docs/SPEC.md) を参照してください。

## ライセンス

[MIT License](LICENSE)。利用しているライブラリのライセンスは [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) と、アプリのヘルプページで確認できます。
性格診断の設問は IPIP（International Personality Item Pool, パブリックドメイン）の IPIP-NEO-120 の構成を参考に作成しています。
