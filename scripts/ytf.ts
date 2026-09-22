import { isEmpty } from '../shared/helpers/is-empty';

import type { YtfRuntime } from './types/ytf-runtime';

((): void => {
  // 本スクリプト起動中なら何もしない
  if(['starting', 'ready'].includes(window.__YTF__?.status ?? '')) return;
  // YouTube 上で実行されていない場合は何もしない
  if(location.hostname.includes('youtube.com')) return;
  // フレーム内のページでないことを確認する
  if(window.top !== window.self) return;
  
  /** 本スクリプトのステータス */
  let status: YtfRuntime['status'] = 'idle';
  
  /** API のベース URL */
  const apiUrl = 'https://ytf.neos21.workers.dev/api';
  /** API URL に依存しないトークンの保存キー */
  const storageKey = 'ytf:token';
  
  /** LocalStorage からトークンを取得する・LocalStorage に保存できない環境ではそのページを開いている間だけ `window.prompt()` での入力値を使用する */
  const readToken = (): string | null => {
    try {
      return localStorage.getItem(storageKey);
    }
    catch {
      return null;
    }
  };
  
  /** 設定の検証と認証を行う・失敗しても公開入口を残し、再実行できるようにする */
  const initialize = async (): Promise<boolean> => {
    status = 'starting';
    try {
      let nextToken = readToken();
      if(isEmpty(nextToken)) nextToken = prompt('Neo\'s YouTube Filter のトークンを入力してください');
      if(isEmpty(nextToken)) {
        status = 'idle';
        return false;
      }
      
      nextToken = String(nextToken).trim();
      if(isEmpty(nextToken) || (/\s/).test(nextToken)) {
        status = 'error';
        alert('空白を含まないトークンを入力してください');
        return false;
      }
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(`${apiUrl}/login`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${nextToken}` },
          credentials: 'omit',
          redirect: 'error',
          signal: controller.signal
        });
        
        if(response.status === 401) {
          try {
            if(readToken() === nextToken) localStorage.removeItem(storageKey);
          }
          catch { /* 保存領域を使用できなくても再入力は可能 */ }
          status = 'error';
          alert('トークンが一致しません・ページを再読み込みして再実行してください');
          return false;
        }
        
        if(!response.ok) {
          status = 'error';
          alert('API の認証確認に失敗しました・時間をおいて再実行してください');
          return false;
        }
        
        const body: unknown = await response.json();
        if(body == null || typeof body !== 'object' || !('result' in body) || body.result !== true) {
          status = 'error';
          alert('API の認証レスポンスが不正です');
          return false;
        }
      }
      finally {
        clearTimeout(timeout);
      }
      
      try {
        localStorage.setItem(storageKey, nextToken);
      }
      catch {
        alert('トークンを保存できませんでした・このページでは使用できますが、次回は再入力が必要です');
      }
      status = 'ready';
      return true;
    }
    catch {
      status = 'error';
      // 例外にはリクエスト情報が含まれる可能性があるため、そのまま表示・出力しない
      alert('起動に失敗しました・API URL と通信状態を確認して再実行してください');
      return false;
    }
  };
  
  // 入力や通信を始める前に状態を公開し、初期化中の重複評価も防ぐ
  window.__YTF__ = {
    get status(): YtfRuntime['status'] { return status; }
  };
  void initialize();
})();
