# 日本に住む外国人は、どんな在留資格でいるか

出入国在留管理庁「在留外国人統計」（2011年までは「登録外国人統計」）をもとに、在留外国人を時代／国・地域／在留資格の3つの切り口で探索するダッシュボード。

- 想定URL: https://japan-foreigners-status.visualizing.jp/
- シリーズ: [日本にいる外国人は、どこから来たか](https://japan-foreigners.visualizing.jp/)（`../japan-foreigners/`）

visualizing.jp スタンドアロン（dataviz.jp サブスクツールではない）。

## 開発

```bash
npm install
npm run fetch && npm run normalize && npm run data && npm run verify
npm run dev
```

| スクリプト | 内容 |
| --- | --- |
| `npm run fetch` | 各年末の Excel を e-Stat から `data/raw/` へ（`-- --force` で取り直し） |
| `npm run normalize` | 正規化 JSON を `data/normalized/` へ |
| `npm run data` | 配信用 JSON を `public/data/` へ |
| `npm run verify` | 在留資格の和・国籍の和・出入国在留管理庁の推移表との突き合わせ |
| `npm run dev` | Vite 開発サーバ |
| `npm run build` | 本番ビルド |
| `npm run typecheck` | TypeScript 検査 |

データ設計の正本は [`docs/data-sources.md`](docs/data-sources.md)。

## ビュー

- **時代** — 在留資格のまとまり別の在留外国人数（2006–）
- **国・地域** — 年ごとの順位と、上位の構成の推移（2015–）、選んだ国の在留資格の構成
- **在留資格** — 在留資格ごとの推移と、その国籍・地域の構成（2015–）

## デプロイ

`main` への push で GitHub Pages にデプロイ（`.github/workflows/pages.yml`）。カスタムドメインは `public/CNAME`。
