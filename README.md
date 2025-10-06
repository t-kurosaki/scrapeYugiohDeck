# 遊戯王デッキレシピスクレイピングツール

遊戯王の公式データベースサイトからデッキレシピをスクレイピングし、カード画像をダウンロードするTypeScriptツールです。

## 機能

- 公開デッキレシピのスクレイピング
- カード情報の取得（カード名、画像URL、枚数）
- カード画像の一括ダウンロード
- JSON形式での結果保存

## セットアップ

```bash
# 依存関係のインストール
npm install

# 環境変数ファイルの作成（オプション）
cp .env.example .env
# .envファイルを編集してDEFARUT_URLを設定

# TypeScriptのビルド
npm run build
```

## 使用方法

### 1. デッキレシピのスクレイピング

```bash
# コマンドライン引数でURLを指定
npm run dev "デッキURL"

# または環境変数でデフォルトURLを設定している場合
npm run dev
```

例：
```bash
npm run dev "https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn=..."
```

### 環境変数の設定

`.env`ファイルを作成してデフォルトのデッキURLを設定できます：

```bash
# .envファイル
DEFARUT_URL="https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn=..."
```

### 2. カード画像のダウンロード

```bash
npm run download <デッキID>
```

例：
```bash
npm run download 16
```

## 出力ファイル

- `output/deck_<ID>.json` - スクレイピング結果（JSON形式）
- `downloads/cards/` - ダウンロードされたカード画像

## ファイル構成

```
src/
├── index.ts              # メイン実行スクリプト
├── scraper.ts            # スクレイピングクラス
├── image-downloader.ts   # 画像ダウンローダー
├── download-images.ts    # 画像ダウンロード実行スクリプト
├── types.ts              # TypeScript型定義
└── utils.ts              # ユーティリティ関数
```

## 注意事項

- 公開されているデッキレシピのみスクレイピング可能です
- ログインが必要なプライベートデッキは対象外です
- サーバーへの負荷を考慮し、適切な間隔でリクエストを送信します
- カード画像のダウンロードは並列処理で効率化されています

## ライセンス

MIT License