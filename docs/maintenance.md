# Maintenance

開発者向けの保守メモを示す。ここに記載した判断は依存関係やツールの状況に応じて見直す。


## 依存パッケージのメジャーアップデート

TypeScript v6 (v6.0.3 が最終) から v7 への更新は、`typescript-eslint` パッケージが TS7 系に対応していないため保留する。`typescript-eslint` は ESLint において TypeScript 向けルールを提供する他、ESLint 時の TSX のパーサとしても使用されているため。一応 `$ npm install --force` で無理矢理インストールして TS7 系と同居させても動きはしたが、やめておく。

パッケージを最新化する場合は個別パッケージだけを先行させず、利用中のプラグイン、型定義、ビルドツールとの互換性を確認してから行う。更新後は `$ npm run lint && npm run build` を実行する。


## 生成ファイル

`$ npm run build` は `$ wrangler types` と React Router の型生成を実行する。生成後は `worker-configuration.d.ts` などの差分を確認し、設定変更に由来する必要な差分だけを残す。
