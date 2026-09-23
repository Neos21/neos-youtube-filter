# Neo's YouTube Filter (YTF)

YouTube の見たくない動画を非表示にする仕組み。

<https://ytf.neos21.workers.dev>


## 機能概要

YouTube の「ホーム画面」、「動画ページの関連動画欄」、「検索結果ページ」から、「非表示にしたい動画」を非表示にする仕組みを提供する。

D1 データベースに「非表示にしたい動画・チャンネル」の情報を持っておき、Hono で公開する API で CRUD できるようにする。この情報は React Router SPA で提供する管理画面からも CRUD 可能。

PC の場合は Tampermonkey より、iPhone の場合はブックマークレットより「メインスクリプト `ytf.js`」を読み込み、このスクリプトが YouTube 上で実際に動画を非表示にする。また、表示されている動画やチャンネルについて非表示設定に追加するボタン等も提供する。


## 技術スタック

- フロントエンド : React + React Router (SPA モード)
    - `isbot` パッケージは React Router が必須で入れてくるため、SPA モードでは使用しない想定だが `package.json` に記述が残る
- UI : Tailwind CSS + daisyUI
- State 管理 : Zustand
- HTTP クライアント : ky
- バリデーション : Zod
- バックエンド : Hono (TypeScript)
- ビルドツール : Vite
- 実行環境 : Cloudflare Workers
- DB : Cloudflare D1 (SQLite)
- Linter・Formatter : ESLint
    - セットアップで用いるため `globals` パッケージを導入している
    - 動作のために `jiti` パッケージが必要なため `package.json` に記載アリ
- メインスクリプト部分のビルドツール : esbuild


## 開発の開始

```bash
# 初期インストール
$ npm install
# `.dev.vars.example` を参考に `.dev.vars` を用意する

# 開発サーバを起動する
$ npm run dev

# Lint を実行する
$ npm run lint

# ビルドする
$ npm run build

# メインスクリプトだけを型チェック・Bundle・Minify する
$ npm run build:ytf

# ビルド後にプレビューサーバを起動する
$ npm run preview
```

`$ npm run build:ytf` は `scripts/ytf.ts` を入口に、`build/client/ytf.js` を単一の IIFE として生成する。アプリの型生成や Vite ビルド、環境変数ファイルは不要。構文変換の対象は現状の最新版とし、ブラウザ API の Polyfill は追加しない。

### Cloudflare Workers へのデプロイ

本番デプロイは開発者が手動で行う。AI エージェントは実行しない。

```bash
$ npm run deploy
```

### D1 データベース操作

D1 の作成、SQL 実行、マイグレーションは開発者が手動で行う。AI エージェントはローカル・本番のどちらに対しても実行してはならない。

```bash
# D1 データベースを作成する
$ wrangler d1 create ytf

# テーブルを確認するコマンド例
$ wrangler d1 execute ytf --local  --command='SELECT * FROM 【テーブル名】'
$ wrangler d1 execute ytf --remote --command='SELECT * FROM 【テーブル名】'

# 任意の SQL ファイルを実行するコマンド例
$ wrangler d1 execute ytf --local  --file='./【任意の SQL ファイル】.sql'
$ wrangler d1 execute ytf --remote --file='./【任意の SQL ファイル】.sql'

# マイグレーション用 SQL を実行するコマンド例
$ wrangler d1 execute ytf --local  --file='./migrations/create-tables.sql'
$ wrangler d1 execute ytf --local  --file='./migrations/drop-tables.sql'
$ wrangler d1 execute ytf --remote --file='./migrations/create-tables.sql'
$ wrangler d1 execute ytf --remote --file='./migrations/drop-tables.sql'

# テーブル・インデックス一覧を出力するコマンド例
$ wrangler d1 execute ytf --local  --command='SELECT * FROM sqlite_master WHERE type = '\''table'\'''
$ wrangler d1 execute ytf --local  --command='SELECT * FROM sqlite_master WHERE type = '\''index'\'''
$ wrangler d1 execute ytf --remote --command='SELECT * FROM sqlite_master WHERE type = '\''table'\'''
$ wrangler d1 execute ytf --remote --command='SELECT * FROM sqlite_master WHERE type = '\''index'\'''

# リモートのデータをバックアップとして取得するコマンド例
$ wrangler d1 execute ytf --remote --command='SELECT * FROM 【テーブル名】' --json | jq --compact-output '.[].results[]' > ./migrations/backup.jsonl
```

### シークレット管理

- ローカル開発時は Git 管理対象外の `.dev.vars` が自動的に参照される
- Binding の型は `server/types/hono-bindings.ts` に定義する
- 本番シークレットの登録は開発者が手動で行い、AI エージェントは実行しない

```bash
$ echo 'EXAMPLE_VALUE' | wrangler secret put API_TOKEN --name ytf
```


## ドキュメント

| ファイル                           | 役割                                                |
|------------------------------------|-----------------------------------------------------|
| [docs/README.md](./docs/README.md) | 詳細ドキュメントの配置方針と索引                    |
| [AGENTS.md](./AGENTS.md)           | AI エージェントが常に守るルールと詳細ルールへの入口 |
| [TASKS.md](./TASKS.md)             | 実行順が必要な未完了タスク                          |

同じ説明を複数ファイルに重複させず、詳細を所有する文書にリンクする。実装固有の処理順や実装意図の説明などは、対象ソースコードのドキュメンテーションコメントを正とする。


## Links

- [Neo's World](https://neos21.net/)
