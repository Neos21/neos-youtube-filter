# Frontend Rules

`client/` を変更する場合に適用する。


## State と画面状態

- 既存 State から導出できる表示状態のために、重複した State を追加しない
- `useState` は行末コメントで用途と `null`・空文字などの特殊状態を示す
- 初期読込中も入力欄の位置と見た目を維持する場合は、スピナーへの置換や `disabled` のグレーアウトを避け、空の入力欄を `readOnly` で表示する
- 入力欄の位置をずらしたくない可変メッセージは入力欄より後に置く
- 他画面で採用されていない Hook を Lint 回避だけのために導入せず、既存画面の実装パターンを優先する


## 遷移

- アプリ内遷移は React Router の `useNavigate()` を使う


## イベントと API

- イベントハンドラは `onSubmit`・`onLoadFoo`・`onChangeBar` のように `on` を接頭辞にする
- `handleHoge` 系の命名を使わない
- UX で発火するフォーム送信は `react` から Type Import した `SubmitEvent` を使い、`FormEvent` は使わない
- 入力バリデーションには `shared/schemas/` の Zod Schema を使い、空文字チェックには `isEmpty()` を使う
- `ky` の `json<T>()` は `json<{ result: Array<Example>; }>()` のように型引数末尾にセミコロンを付ける
- API 呼び出しの例外は `try`・`catch` の中に閉じ込め、Promise の `.then()`・`.catch()` を使わない


## JSX とレイアウト

- 条件付き JSX は `{condition && ( ... )}` のように JSX 部分をカッコで囲み、改行・インデントする
- `aria-*` 属性と `role` 属性は使用しない
- マージンは下方向に付与し、上方向のマージンは使用しない
