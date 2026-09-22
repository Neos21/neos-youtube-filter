# Backend Rules

`server/` を変更する場合に適用する。


## Repository と Service

- DB の単一テーブル CRUD は `server/repositories/` 配下にテーブル別の Repository として実装する
- Repository のファイル名とクラス名は複数形で一致させる
    - 例 : `examples-repository.ts`・`ExamplesRepository`
- Repository のメソッド名は `findAll`・`findById`・`create`・`update` など、一覧取得と単体操作を区別する
- `update` は変更を許可しない関連先 ID などを更新対象に含めない
- 複数テーブルを横断する Read Model とビジネスロジックは `server/services/` に置く
- サーバ内部だけで使う JOIN 行などの型は `server/types/` に置く


## 複数書き込み

- 複数テーブルへの作成・更新を不可分にする必要がある場合は D1 の `batch()` を使う
- 途中失敗時に、一部だけが作成・更新された状態を残さない


## 想定されるエラー

- 想定されるエラーに例外オブジェクト、`throw`、`onError` Middleware を使わない
- `shared/types/utilities/result.ts` の `Result` 型を使い、Controller で正常・異常レスポンスを明示的に分岐する


## Route Controller

- Route は HTTP の責務に限定し、DB クエリやビジネスロジックを直接持たない
- `context.req.json()` は `await context.req.json().catch(() => null)` で受ける
- `body == null` の場合は 400 エラーを返す
- JSON ボディの構文不正と Schema 不正を区別せず、いずれもクライアント入力エラーとして 400 を返す
- 正常レスポンスはトップレベルを `result` のみ、エラーレスポンスはトップレベルを `error` のみとする
- ルートパス文字列に `/:id` のようなコロンを含む場合は、`// eslint-disable-line neos-eslint-plugin/comment-colon-spacing` を付ける
- URL の ID は整数に変換できない場合に 400 を返す
- ID・Query・Body は Route で検証し、DB 状態を伴う業務条件は Service でも検証する
