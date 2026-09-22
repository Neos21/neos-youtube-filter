# Shared Rules

`shared/` を変更する場合に適用する。


## 型の分類

`shared/types/` は次の分類を維持する。

- `utilities/` : Result、Boolean 制御などの汎用型
- `entities/` : DB テーブルと対になる型。テーブル別に作成する
- `app/` : 画面・API・業務ロジックで使う合成型


## Schema

- 入力バリデーションは `client/`・`server/` で共有する Zod Schema を使う
- 空文字チェックが必要な場合は `isEmpty()` を使い、個別に `=== ''` を重複させない
- 業務上の上限・下限は共有定数を参照する
- 更新用 Schema は、対象操作で変更を許可する項目だけに限定する


## Helper と Service

- 業務知識を持たない整形・判定処理は `shared/helpers/` に置く
- `client/`・`server/` の両方で使うビジネスロジックは `shared/services/` に置く
- SQL、画面、Server Service に同じビジネスロジックを重複実装しない
- 計算途中の値と表示用の丸めを分離する
