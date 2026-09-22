# Boilerplate : React Router (SPA) + Hono + Cloudflare Workers

React Router (SPA モード) + Hono + Cloudflare Workers プロジェクトのボイラープレート。


## サンプルとしての機能

サンプルコードには `example`・`examples` の命名・記載がある他、隅付き括弧を用いたプレースホルダを記載している。

`/api/login` エンドポイントおよび `index.tsx` に、JWT を発行するログイン認証の簡易サンプルを付属している。簡単のため、クライアントでは LocalStorage に JWT を保管している点に留意。

### 主な説明用サンプルファイル (実コードからは削除して良い)

- `server/repositories/examples-repository.ts`
- `server/routes/api/examples/`
- `shared/schemas/example-schema.ts`
- `shared/services/example-service.ts`
- `shared/types/app/example-display.ts`
- `shared/types/entities/example.ts`

### 実コード作成時に用意する必要があるファイル

- `.dev.vars` (`.dev.vars.example` を参考に `hono-bindings.ts` と揃うように作成する)
- `public/favicon.ico`
- `public/apple-touch-icon.png`
- `public/icon-192.png`
- `public/icon-512.png`
    - 画像類は `public/manifest.webmanifest` と `root.tsx` でファイル名を参照している点に留意


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


## 開発の開始

```bash
$ npm install
$ npm run dev
```

開発手順、検証コマンド、D1・デプロイ操作は [CONTRIBUTING.md](./CONTRIBUTING.md) を参照のこと。


## ドキュメント

| ファイル                                               | 役割                                                     |
|--------------------------------------------------------|----------------------------------------------------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md)                   | システム構成、ディレクトリ・レイヤーの責務、データフロー |
| [CONTRIBUTING.md](./CONTRIBUTING.md)                   | 開発手順、検証、開発者が手動で行う運用操作               |
| [docs/README.md](./docs/README.md)                     | 詳細ドキュメントの配置方針と索引                         |
| [docs/features/README.md](./docs/features/README.md)   | 機能別仕様の索引                                         |
| [docs/decisions/README.md](./docs/decisions/README.md) | 重要な設計判断とその理由 (ADR)                           |
| [AGENTS.md](./AGENTS.md)                               | AI エージェントが常に守るルールと詳細ルールへの入口      |
| [TASKS.md](./TASKS.md)                                 | 実行順が必要な未完了タスク                               |

同じ説明を複数ファイルに重複させず、詳細を所有する文書にリンクする。実装固有の処理順や実装意図の説明などは、対象ソースコードのドキュメンテーションコメントを正とする。


## ページ一覧

| パス    | 機能                                                                         |
|-------- |------------------------------------------------------------------------------|
| `/`     | ログイン。ログイン済みの場合は `/home` に遷移する                            |
| `/home` | ログイン後のホーム。共通サイドメニューはこのページへの遷移後に初めて表示する |


## API エンドポイント一覧

| リソース | メソッド | パス                | 用途                                |
|----------|----------|---------------------|-------------------------------------|
| 認証     | `POST`   | `/api/login`        | パスワードを照合して JWT を発行する |
| サンプル | `GET`    | `/api/examples`     | 一覧を取得する                      |
| サンプル | `GET`    | `/api/examples/:id` | 1件取得する                         |
| サンプル | `POST`   | `/api/examples`     | 追加する                            |
| サンプル | `PATCH`  | `/api/examples/:id` | 更新する                            |
| サンプル | `DELETE` | `/api/examples/:id` | 削除する                            |


## Links

- [Neo's World](https://neos21.net/)
