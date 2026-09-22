# Neo's YouTube Filter

YouTube の見たくない動画を非表示にする仕組み。


## コンセプト

- **YouTube の「ホーム画面」、「動画ページの関連動画欄」、「検索結果ページ」から、「非表示にしたい動画」を非表示にする仕組みを作る**
- D1 データベースに「非表示にしたい動画情報」を持つ
    - `blocked_videos` テーブル : 動画単位で非表示にする
        - `https://www.youtube.com/watch?v=XXXXXXXXXXX` の `XXXXXXXXXXX` 部分を `video_id` カラムに保持する
        - (動画タイトルも `title` カラムに参考情報として保持しておく)
    - `blocked_channels` テーブル : チャンネル単位で非表示にする
        - `https://www.youtube.com/@HANDLE` の `@HANDLE` 部分を `handle` カラムに保持する
        - `https://www.youtube.com/channel/UCXXXXXXXXXXXXXXXXXXXXXX` の `UCXXXXXXXXXXXXXXXXXXXXXX` 部分を `channel_id` カラムに保持する
        - YouTube の DOM からはいずれかしか検出できないが、両方の紐付けができれば同一レコードに保持する
        - (チャンネル名も `title` カラムに参考情報として保持しておく)
    - `blocked_patterns` テーブル : 文字列もしくは正規表現を用意しておき、動画名もしくはチャンネル名にヒットしたら非表示にする
        - `type` カラム : `string` か `regexp`
        - `pattern` カラム : 非表示にしたい文字列か正規表現
        - `flags` カラム : 正規表現の場合、デフォルトでは `iu` を指定するが、それ以外を明示的に指定したい場合にフラグを指定する
    - `subscribed_channels` テーブル : 購読しているチャンネル情報・`blocked_channels` とは異なる理由で非表示とするため別途保持する
        - `handle`・`channel_id`・`title` カラムを持つ
- React Router SPA にて上述の D1 を CRUD できるようにし、「非表示にしたい動画情報」を管理できるようにする
- Hono で API を定義する・この API は 後述の「メインスクリプト」からもコール可能にする
- PC の場合 Tampermonkey より、iPhone の場合ブックマークレットより「メインスクリプト `/ytf.js`」を読み込み、このスクリプトが YouTube 上で実際に動画を非表示にする
    - メインスクリプトから API コールして「非表示にしたい動画情報」を取得し、それと突合して動画を非表示にする
    - API コールには Bearer トークンを指定するが、ブックマークレットからの呼び出しが容易になるように JWT を発行するのではなく固定文字列による簡易認証とする
    - API コールして取得した結果は LocalStorage にもキャッシュを持つようにする
    - `.ytf-hidden { display: none !important; }` といった CSS を注入し、CSS クラス指定で非表示にする (`style` 属性値を直接書き換えない)
    - 画面右上にチェックボックスを配置し、動画を非表示にするか、非表示を解除するかをトグルできるようにする
        - 「ホーム画面」「動画ページ」では「非表示にする (チェック状態)」をデフォルトに、「検索結果ページ」では「非表示にしない (チェックを外した状態)」をデフォルトにする
        - YouTube 内のページ移動は `window.addEventListener('yt-navigate-finish')` で検出可能、ページ移動ごとに `new URL(location.href)` をチェックすれば良さそう
    - 同じメインスクリプトを重複してロードしないように `window.__YTF__` オブジェクトを生成しチェックする仕組みを作る
    - 動画サムネイル上に「この動画を非表示にする」「このチャンネルを非表示にする」ボタンを配置し、クリックで API コールして「非表示にする動画情報」を D1 に追加しつつ、画面上も非表示にする


## 検証済みの内容

`public/_headers` → `build/client/_headers` に以下を記しておくことで、`www.youtube.com` および `m.youtube.com` からのアクセスを許可し、「メインスクリプト」を読み込めるようにした。

```
/*
  Access-Control-Allow-Origin: *
```

`wrangler.jsonc` に以下のように指定することで、`/api` 配下への Fetch リクエストが Workers に到達するようにした。

```json
{
  "assets": {
    "directory": "./build/client",
    "not_found_handling": "single-page-application",
    "binding": "ASSETS",
    "run_worker_first": [
      "/api/*"
    ]
  }
}
```

`server/index.ts` の `createHonoServer()` 部分は以下のように定義することで、`/api` 配下へのリクエストが SPA としてフォールバックされず Hono エンドポイントに到達するようにした。

```typescript
export const app = new Hono<{ Bindings: HonoBindings; }>();
app.route(apiPath, api);
export default await createHonoServer({ app });
```

`server/routes/api/api.ts` に以下を記すことで CORS ヘッダを付与した。

```typescript
api.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}));
```

「メインスクリプト」となる `scripts/ytf.js` を `$ npm run build` 後に `build/client/ytf.js` へと配置してデプロイすることで、ブックマークレットから読み込めるようにした。

PC Brave、iPhone Safari、iPhone Brave ブラウザにて、`www.youtube.com` および `m.youtube.com` 上で以下のブックマークレットを実行することで、「メインスクリプト」を読み込んで実行できることを確認した。

```javascript
javascript:(async () => {
  try {
    const policy = trustedTypes.createPolicy('neos21-ytf', { createScript: code => code });
    const response = await fetch('https://ytf.neos21.workers.dev/ytf.js');
    const code = await response.text();
    eval(policy.createScript(code));
  }
  catch(error) {
    console.error('スクリプト読み込みに失敗しました', error);
    alert(`スクリプト読み込みに失敗しました : ${error}`);
  }
})();
```

PC Brave の Tampermonkey で以下のように `@require` で指定することで、YouTube 読み込み時に「メインスクリプト」を読み込んで実行できることを確認した。

```javascript
// ==UserScript==
// @name         Neo's YouTube Filter
// @namespace    https://neos21.net/
// @version      2026-09-22
// @description  Neo's YouTube Filter
// @author       Neos21
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @require      https://ytf.neos21.workers.dev/ytf.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @run-at       document-idle
// ==/UserScript==
```


## サンプルとしての機能

サンプルコードには `example`・`examples` の命名・記載がある他、隅付き括弧を用いたプレースホルダを記載している。以下は最終的に実コードから削除して良い。

- `server/repositories/examples-repository.txt`
- `server/routes/api/examples/`
- `shared/schemas/example-schema.ts`


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
# `.dev.vars.example` を参考に `.dev.vars` を用意する
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
