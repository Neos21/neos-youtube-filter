# Agent Rules

AI エージェント向けの詳細ルールを、作業内容ごとに必要なものだけ読めるよう分割する。ルートの [AGENTS.md](../../AGENTS.md) を入口とし、本ファイルだけで作業手順を完結させない。


## ルール一覧

| ファイル                                   | 適用範囲                                       |
|--------------------------------------------|------------------------------------------------|
| [workflow.md](./workflow.md)               | すべての変更に共通する実行・レビュー・検証手順 |
| [common.md](./common.md)                   | 言語・命名・公開範囲・共有処理の共通規約       |
| [frontend.md](./frontend.md)               | `client/` の React・State・UI・API 呼び出し    |
| [backend.md](./backend.md)                 | `server/` の Route・Service・Repository・D1    |
| [shared.md](./shared.md)                   | `shared/` の型・Schema・Helper・共有 Service   |
| [documentation.md](./documentation.md)     | Markdown とドキュメンテーションコメント        |
| [review-feedback.md](./review-feedback.md) | レビュー指摘の反映とルール肥大化の防止         |


## 管理方針

- 全作業に必須の禁止事項とルーティングは `AGENTS.md` に記載する
- 詳細ルールは適用範囲を1つに絞り、別ファイルと重複させない
- ファイル名やディレクトリが増えた場合も、作業対象から読込先を機械的に判断できる分類を保つ
- 一時的なタスク固有指示を恒久ルールに追加しない
- 機械的に検出できる規則は、可能な限り ESLint・型・Schema・テストに移す
