# Architecture

本プロジェクトの現行実装におけるシステム構成、依存方向、各レイヤーの責務を示す。


## システム構成

```text
Browser
  └ React SPA
     └ `/api` への HTTP リクエスト
        └ Cloudflare Workers + Hono
           └ Cloudflare D1 (SQLite)
```

- React Router を SPA モードで利用し、画面遷移とログイン後の共通レイアウトを構成する
- Hono の `/api` 配下に認証・各リソースのルートを登録する
- Cloudflare Workers の Binding から D1 と認証用環境変数を参照する


## ディレクトリの責務

| ディレクトリ           | 責務                                                                             |
|------------------------|----------------------------------------------------------------------------------|
| `client/`              | React のページ、レイアウト、クライアント State、API 呼び出し、表示用ヘルパー     |
| `server/routes/`       | HTTP 入出力、認証、パラメータ・リクエスト検証、レスポンスへの変換                |
| `server/repositories/` | D1 の単一テーブルに対する CRUD                                                   |
| `server/services/`     | 複数テーブルを横断する Read Model と、複数 Repository を組み合わせるユースケース |
| `server/types/`        | JOIN 直後の SQL 行など、サーバ内部だけで使う型                                   |
| `shared/constants/`    | Client・Server で共有する定数                                                    |
| `shared/helpers/`      | 業務知識を持たない共有処理                                                       |
| `shared/schemas/`      | API と画面で共有する Zod Schema                                                  |
| `shared/services/`     | Client・Server の両方から利用するビジネスロジック                                |
| `shared/types/`        | Entity、画面・API 用の合成型、汎用型                                             |


## 依存方向

```text
client ┐
       ├─> shared
server ┘

server/routes   -> server/repositories (単一テーブルの単純な CRUD)
server/routes   -> server/services     (複合 Read Model・ユースケース)
server/services -> server/repositories または D1
server/services -> shared/services
```

- `shared/` は `client/`・`server/` に依存しない
- Route は HTTP の責務に限定し、DB クエリやビジネスロジックを直接持たない
- Repository は単一テーブルの永続化を抽象化し、画面都合の複合 `JOIN` を持たない
- 複数テーブルを横断した Read Model は、用途名を持つ Service が D1 から直接構築する


## レイヤーの境界

`shared/` には `client/`・`server/` 間で共有する契約と処理を置き、サーバ内部だけで扱う DB 取得直後の表現は `server/` に閉じる。複合 Read Model は Service が公開可能なモデルに変換してから Route に渡す。

型の分類と配置に関する実装ルールは [Shared Rules](./docs/agent-rules/shared.md)、サーバ各層の実装ルールは [Backend Rules](./docs/agent-rules/backend.md) を参照のこと。


## 横断的な設計

- 整合性はサーバ側で保証し、不可分な複数書き込みは一つのユースケースとして扱う

各領域の具体的な実装規則は [Agent Rules](./docs/agent-rules/README.md) を参照のこと。
