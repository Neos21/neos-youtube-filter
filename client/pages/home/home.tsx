import { type ReactElement } from 'react';

/** ログイン後のトップページ */
export default function Home(): ReactElement {
  const bookmarkExampleCode = `javascript:(async () => {
  try {
    const policy = trustedTypes.createPolicy('neos21-ytf', { createScript: code => code });
    const response = await fetch('https://ytf.neos21.workers.dev/ytf.js');
    const code = await response.text();
    eval(policy.createScript(code));
  }
  catch(error) {
    console.error('スクリプト読み込みに失敗しました', error);
    alert(\`スクリプト読み込みに失敗しました : \${error}\`);
  }
})();`;
  
  const tampermonkeyExampleCode = `// ==UserScript==
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
// @grant        none
// @noframes
// ==/UserScript==`;
  
  return (
    <main>
      <h1 className="mb-4 font-bold">ホーム</h1>
      
      <p className="mb-6">サイドメニューから各ページに移動してください。</p>
      
      <ul>
        <li className="ml-6 mb-1 list-disc">ブックマークレットのサンプルコード</li>
      </ul>
      <p><textarea className="mb-4 textarea w-full" value={bookmarkExampleCode} rows={6} /></p>
      
      <ul>
        <li className="ml-6 mb-1 list-disc">Tampermonkey のサンプルコード</li>
      </ul>
      <p><textarea className="mb-6 textarea w-full" value={tampermonkeyExampleCode} rows={6} /></p>
      
      <p><a href="https://www.youtube.com" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">YouTube</a></p>
    </main>
  );
}
