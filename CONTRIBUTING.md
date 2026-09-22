# Contributing

本プロジェクトを変更・検証する際の共通手順を示す。AI エージェント固有の詳細ルールは [AGENTS.md](./AGENTS.md) を参照のこと。


## 開発の進め方

1. `TASKS.md` が存在する場合は、先頭の未完タスクを確認する
2. 変更範囲を1回でレビュー可能な大きさに分ける
3. 実装前に変更方針と対象ファイルを確認する
4. 変更後に差分を確認する
5. Lint とビルドを実行し、開発者のレビューを受ける

既存のステージ済み・未ステージの変更は、現在の作業と無関係であれば変更しない。


## npm コマンド

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

`$ npm run build:ytf` は `scripts/ytf.ts` を入口に、`build/client/ytf.js` を単一の IIFE として生成する。アプリの型生成や Vite ビルド、環境変数ファイルは不要。構文変換の対象は Safari 16・Chrome 110 とし、ブラウザ API の Polyfill は追加しない。

`$ npm run build` と `$ npm run build-only` は、アプリのビルド後にメインスクリプトを生成する。プレビュー・デプロイでは既存の静的資産設定と `public/_headers` により `/ytf.js` を配信する。

変更完了時は次を実行する。

```bash
$ npm run lint && npm run build
```


## Cloudflare Workers へのデプロイ

本番デプロイは開発者が手動で行う。AI エージェントは実行しない。

```bash
$ npm run deploy
```


## D1 データベース操作

D1 の作成、SQL 実行、マイグレーションは開発者が手動で行う。AI エージェントはローカル・本番のどちらに対しても実行してはならない。

`./schema.sql` は任意の SQL ファイルを表す開発者向けのコマンド例であり、同名ファイルを本リポジトリに配置する仕様ではない。AI エージェントはファイルの欠落として扱わず、以下のコマンド例を実行してはならない。

```bash
# D1 データベースを作成する
$ wrangler d1 create ytf

# テーブルを確認するコマンド例
$ wrangler d1 execute ytf --local  --command='SELECT * FROM 【テーブル名】'
$ wrangler d1 execute ytf --remote --command='SELECT * FROM 【テーブル名】'

# 任意の SQL ファイルを実行するコマンド例
$ wrangler d1 execute ytf --local  --file='./schema.sql'
$ wrangler d1 execute ytf --remote --file='./schema.sql'

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


## シークレット管理

- ローカル開発時は Git 管理対象外の `.dev.vars` が自動的に参照される
- Binding の型は `server/types/hono-bindings.ts` に定義する
- 本番シークレットの登録は開発者が手動で行い、AI エージェントは実行しない

```bash
$ echo 'EXAMPLE_VALUE' | wrangler secret put API_TOKEN --name ytf
```
