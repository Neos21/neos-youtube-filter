import { type ReactElement } from 'react';

/** ログイン後のトップページ */
export default function Home(): ReactElement {
  return (
    <main>
      <h1 className="mb-4 font-bold">ホーム</h1>
      
      <p>サイドメニューから各ページに移動してください。</p>
    </main>
  );
}
