import { extractYouTubeCards } from './dom/extract-youtube-cards';
import { getYouTubePage } from './dom/get-youtube-page';
import { filterRulesCacheSchema, filterRulesSchema } from './schemas/filter-rules-schema';
import { isEmpty } from '../shared/helpers/is-empty';

import type { YouTubeCard } from './types/youtube-card';
import type { YtfRuntime } from './types/ytf-runtime';
import type { FilterRules } from '../shared/types/app/filter-rules';

((): void => {
  // 本スクリプト起動中なら何もしない・失敗やキャンセル後は既存の入口で再試行する
  if(window.__YTF__ != null) {
    if(!['starting', 'ready'].includes(window.__YTF__.status)) void window.__YTF__.refresh();
    return;
  }
  // YouTube 上で実行されていない場合は何もしない
  if(!['www.youtube.com', 'm.youtube.com'].includes(location.hostname)) return;
  // フレーム内のページでないことを確認する
  if(window.top !== window.self) return;
  
  /** API のベース URL */
  const apiUrl = 'https://ytf.neos21.workers.dev/api';
  /** API URL に依存しないトークンの保存キー */
  const storageKey = 'ytf:token';
  /** フィルター条件の保存キー・取得元はキャッシュの内容で確認する */
  const cacheKey = 'ytf:filter-rules';
  
  /** 本スクリプトのステータス */
  let status: YtfRuntime['status'] = 'idle';
  /** 最後に取得・復元できた条件・null は未取得 */
  let filterRules: FilterRules | null = null;
  /** API から条件を取得した日時 */
  let fetchedAt: string | null = null;
  /** 利用者に通知する取得・保存エラー */
  let error = '';
  /** トークン・LocalStorage が使用できない場合でもページ内では保持する */
  let token: string | null = null;
  /** 同時再取得をまとめるための実行中 Promise */
  let pendingPromise: Promise<boolean> | null = null;
  
  /** エラーを状態と画面に反映する・例外やレスポンス本文をそのまま表示しない */
  const notifyError = (message: string): void => {
    error = message;
    alert(message);
  };
  
  /** LocalStorage からトークンを取得する・保存不可でも `window.prompt()` の入力値を利用できる */
  const readToken = (): string | null => {
    try {
      return localStorage.getItem(storageKey);
    }
    catch {
      return null;
    }
  };
  
  /** 正常なキャッシュだけを復元する・壊れた値を空の条件として扱わない */
  const restoreCache = (): void => {
    let saved: string | null;
    try {
      saved = localStorage.getItem(cacheKey);
    }
    catch {
      notifyError('キャッシュを読み込めません・API から取得します');
      return;
    }
    if(saved == null) return;
    try {
      const parsed = filterRulesCacheSchema.safeParse(JSON.parse(saved));
      if(!parsed.success || parsed.data.apiUrl !== apiUrl) {
        notifyError('キャッシュの形式または取得元が異なります・API から取得します');
        return;
      }
      filterRules = parsed.data.rules;
      fetchedAt = parsed.data.fetchedAt;
    }
    catch {
      notifyError('キャッシュが破損しています・API から取得します');
    }
  };
  
  /** メモリ上の条件を保存する・保存失敗時もメモリ上の条件を維持する */
  const saveCache = (): void => {
    if(filterRules == null || fetchedAt == null) return;
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ version: 1, fetchedAt, apiUrl, rules: filterRules }));
    }
    catch {
      notifyError('条件をキャッシュに保存できませんでした・このページでは取得済みの条件を使用します');
    }
  };
  
  /** 条件を再取得する・失敗時は復元済みまたは取得済みの条件を保持する */
  const loadFilterRules = async (): Promise<boolean> => {
    status = 'starting';
    error = '';
    try {
      let nextToken = token ?? readToken();
      if(isEmpty(nextToken)) nextToken = window.prompt('Neo\'s YouTube Filter のトークンを入力してください');
      if(isEmpty(nextToken)) {
        status = 'idle';
        return false;
      }
      nextToken = String(nextToken).trim();
      if((/\s/).test(nextToken)) {
        status = filterRules == null ? 'error' : 'ready';
        notifyError('空白を含まないトークンを入力してください');
        return false;
      }
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(`${apiUrl}/filter-rules`, {
          headers: { Authorization: `Bearer ${nextToken}` },
          credentials: 'omit',
          redirect: 'error',
          cache: 'no-store',
          signal: controller.signal
        });
        if(response.status === 401) {
          token = null;
          try {
            if(readToken() === nextToken) localStorage.removeItem(storageKey);
          }
          catch { /* 保存領域を使用できなくても再入力は可能 */ }
          status = 'unauthorized';
          notifyError('トークンが一致しません・ページを再読み込みして再実行してください');
          return false;
        }
        if(!response.ok) {
          status = filterRules == null ? 'error' : 'ready';
          notifyError(filterRules == null ? '条件を取得できませんでした・非表示処理を開始できません' : '条件を更新できませんでした・取得済みの条件を使用します');
          return false;
        }
        const body: unknown = await response.json();
        const parsed = filterRulesSchema.safeParse(body != null && typeof body === 'object' && 'result' in body ? body.result : null);
        if(!parsed.success) {
          status = filterRules == null ? 'error' : 'ready';
          notifyError('フィルター条件の応答形式が不正です・既存の条件を保持します');
          return false;
        }
        token = nextToken;
        filterRules = parsed.data;
        fetchedAt = new Date().toISOString();
        try {
          localStorage.setItem(storageKey, token);
        }
        catch {
          notifyError('トークンを保存できませんでした・次回は再入力が必要です');
        }
        saveCache();
        status = 'ready';
        return true;
      }
      finally {
        clearTimeout(timeout);
      }
    }
    catch {
      status = filterRules == null ? 'error' : 'ready';
      notifyError(filterRules == null ? '通信または応答の読込に失敗しました・非表示処理を開始できません' : '通信または応答の読込に失敗しました・取得済みの条件を使用します');
      return false;
    }
  };
  
  /** 再取得中は同じ Promise を返す */
  const refresh = (): Promise<boolean> => {
    if(pendingPromise != null) return pendingPromise;
    pendingPromise = loadFilterRules().finally(() => { pendingPromise = null; });
    return pendingPromise;
  };
  
  /** 登録成功後の条件を反映する・API 全件取得の日時は書き換えない */
  const updateFilterRules = (nextFilterRules: FilterRules): boolean => {
    // 再取得の応答が登録結果を上書きしないよう、登録側は `refresh()` の完了を待ってから呼ぶ
    if(pendingPromise != null || filterRules == null) return false;
    const parsed = filterRulesSchema.safeParse(nextFilterRules);
    if(!parsed.success) return false;
    filterRules = parsed.data;
    saveCache();
    return true;
  };
  
  // 入力や通信を始める前に状態を公開し、初期化中の重複評価も防ぐ
  window.__YTF__ = {
    get status(): YtfRuntime['status'] { return status; },
    get filterRules(): FilterRules | null { return filterRules; },
    get fetchedAt(): string | null { return fetchedAt; },
    get error(): string { return error; },
    get page(): YtfRuntime['page'] { return getYouTubePage(new URL(location.href)); },
    getCards: (): YouTubeCard[] => extractYouTubeCards(document, new URL(location.href)),
    refresh,
    updateFilterRules
  };
  // 対象ページへの遷移で条件を再取得する・表示制御と詳細な DOM 判定は後続処理で行う
  window.addEventListener('yt-navigate-finish', () => {
    if(getYouTubePage(new URL(location.href)) != null) void refresh();
  });
  restoreCache();
  void refresh();
})();
