# AGENTS.md

本プロジェクトで AI エージェントが常に守る作業手順と、作業内容ごとに読む詳細ルールを示す。


## 作業開始前

1. [README.md](./README.md)、[docs/agent-rules/README.md](./docs/agent-rules/README.md)、[workflow.md](./docs/agent-rules/workflow.md) を読む
2. [TASKS.md](./TASKS.md) が存在する場合は実行ルールを読み、ファイル内で最初の未完タスクだけを実行候補とする
    - `TASKS.md` が存在しない場合は、現在開発者が承認した作業範囲を1タスクとして扱う
3. [common.md](./docs/agent-rules/common.md) を読む
4. 作業対象に応じて、該当する全ての詳細ルールを読む。文書は必要な領域だけを段階的に読み、無関係なルールを作業コンテキストへ追加しない
5. 実行前に変更方針と対象範囲を示し、開発者に開始確認を取る


## 常に守る禁止事項

- Cloudflare D1 への DB マイグレーションを実行しない
- Cloudflare Workers への本番デプロイを実行しない
- 本番シークレットの登録・変更を実行しない
- 修正対象でない既存変更、コメント、空白を編集・削除しない
- 開発者への確認なしに `TASKS.md` の次タスクに移行しない
