# Maintenance

開発者向けの保守メモを示す。ここに記載した判断は依存関係やツールの状況に応じて見直す。


## 依存パッケージのメジャーアップデート

TypeScript v6 (v6.0.3 が最終) から v7 への更新は、`typescript-eslint` パッケージが TS7 系に対応していないため保留する。`typescript-eslint` は ESLint において TypeScript 向けルールを提供する他、ESLint 時の TSX のパーサとしても使用されているため。一応 `$ npm install --force` で無理矢理インストールして TS7 系と同居させても動きはしたが、やめておく。

パッケージを最新化する場合は個別パッケージだけを先行させず、利用中のプラグイン、型定義、ビルドツールとの互換性を確認してから行う。更新後は `$ npm run lint && npm run build` を実行する。


## 生成ファイル

`$ npm run build` は `$ wrangler types` と React Router の型生成を実行する。生成後は `worker-configuration.d.ts` などの差分を確認し、設定変更に由来する必要な差分だけを残す。


## 既知の警告

現状、ビルド時に Wrangler から `envFile` の非推奨警告が表示される。現時点ではビルドを失敗させるものではないため無視して良い。別の互換性対応と合わせて見直す。


## `className` の記述整理方針

現状は `clsx` などのパッケージを導入しておらず、`eslint-plugin-tailwindcss` v4 によるソートのみとしている。今後 CSS クラスの記述が複雑化した場合は、`clsx` と `tailwind-merge` パッケージを用いて `cn()` 関数を作成することを推奨候補とする。

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
```

```tsx
{/* daisyUI 提供のクラス、TailwindCSS 提供のクラス、条件に基づいたクラス指定、といった形で記述を分け、それぞれの中でソートが行われる */}
<div className={cn(
  'alert alert-warning',
  'mb-4 text-sm',
  exampleCondition && 'font-bold'
)}>
```
