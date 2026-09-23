# Documents

プロジェクトの現行仕様、設計判断、保守情報、AI エージェント向け実装ルールを目的別に管理する。


## 一覧

| ファイル・ディレクトリ                  | 役割                                        |
|-----------------------------------------|---------------------------------------------|
| [maintenance.md](./maintenance.md)      | 依存パッケージなどの開発者向け保守メモ      |
| [agent-rules/](./agent-rules/README.md) | AI エージェントが実装時に参照する詳細ルール |


## 配置方針

- プロジェクトの概要と文書全体への入口はルートの [README.md](../README.md) に記載する
- 詳細はその情報を所有する文書に記載し、他の文書からはリンクして重複を避ける
- 特定の実装に閉じた処理順や意図は、対象ソースコードのドキュメンテーションコメントに記載する


## CORS 設定

本プロジェクトは YouTube ドメインから本 Workers への通信が発生するため、CORS 設定が重要になる。

- `public/_headers` で `/*` に `Access-Control-Allow-Origin: *` を指定することで、YouTube ドメインから本 Workers で提供する API や「メインスクリプト JS ファイル」へのアクセスを許可する
- `wrangler.jsonc` で `"run_worker_first": ["/api/*"]` と指定することで、Workers 外部から API エンドポイントへのアクセスができるようにした
- `server/index.ts` の `createHonoServer()` 部分の書き方によって、`/api` 配下へのリクエストが SPA としてフォールバックされず到達するようにした
- `server/routes/api/api.ts` にて `api.use('*', cors())` 設定を入れ、OPTIONS メソッド等を含めて全面的に CORS 設定を許可した
