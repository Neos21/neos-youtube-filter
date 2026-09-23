import { isEmpty } from '../../shared/helpers/is-empty';
import { describeError } from '../helpers/describe-error';
import { requestApi } from '../helpers/request-api';
import { readStorage, removeStorage, writeStorage } from '../helpers/storage';
import { filterRulesCacheSchema, filterRulesSchema } from '../schemas/filter-rules-schema';

import type { FilterRules } from '../../shared/types/app/filter-rules';
import type { YtfRuntime } from '../types/ytf-runtime';
import type { Logger } from '../ui/create-logger';

/** 条件の取得・保存状態・トークン自体は公開しない */
type FilterRulesStore = Pick<YtfRuntime, 'status' | 'filterRules' | 'fetchedAt' | 'error' | 'refresh' | 'updateFilterRules'> & {
  restoreCache: () => void;
};

/** 正常な条件を保持し、取得失敗時も空の条件に置き換えない */
export const createFilterRulesStore = (apiUrl: string, logger: Logger, onChange: (filterRules: FilterRules) => void): FilterRulesStore => {
  /** API URL に依存しないトークンの保存キー */
  const tokenStorageKey = 'ytf:token';
  /** フィルター条件と取得日時の保存キー */
  const cacheStorageKey = 'ytf:filter-rules';
  let status: YtfRuntime['status'] = 'idle';
  let filterRules: FilterRules | null = null;
  let fetchedAt: string | null = null;
  let error = '';
  /** トークン・LocalStorage が使用できない場合でもページ内では保持する */
  let token: string | null = null;
  /** 同時再取得をまとめるための実行中 `Promise` */
  let pendingPromise: Promise<boolean> | null = null;
  
  /** 利用者向けのメッセージと、原因を含むログを分けて出力する */
  const notifyError = (message: string, detail: string): void => {
    error = message;
    logger.error(`${message}: ${detail}`);
    alert(message);
  };
  
  /** LocalStorage からトークンを取得する・利用不可でも入力値で継続できる */
  const readToken = (): string | null => {
    const stored = readStorage(tokenStorageKey);
    if(stored.error != null) logger.error(stored.error);
    return stored.result ?? null;
  };
  
  /** 正常なキャッシュだけを復元する・旧形式の追加項目は検証時に取り除く */
  const restoreCache = (): void => {
    const stored = readStorage(cacheStorageKey);
    if(stored.error != null) {
      notifyError('キャッシュを読み込めません・API から取得します', stored.error);
      return;
    }
    if(stored.result == null) {
      logger.log('キャッシュなし');
      return;
    }
    try {
      const parsed = filterRulesCacheSchema.safeParse(JSON.parse(stored.result));
      if(!parsed.success) {
        notifyError('キャッシュの形式が不正です・API から取得します', parsed.error.message);
        return;
      }
      filterRules = parsed.data.rules;
      fetchedAt = parsed.data.fetchedAt;
      logger.log(`キャッシュ復元 (${fetchedAt})`);
      onChange(filterRules);
    }
    catch(caughtError) {
      notifyError('キャッシュが破損しています・API から取得します', describeError(caughtError));
    }
  };
  
  /** メモリ上の条件を保存する・保存失敗時もメモリ上の条件を維持する */
  const saveCache = (): void => {
    if(filterRules == null || fetchedAt == null) return;
    const stored = writeStorage(cacheStorageKey, JSON.stringify({ fetchedAt, rules: filterRules }));
    if(stored.error != null) notifyError('条件を保存できませんでした・このページでは取得済みの条件を使用します', stored.error);
    else logger.log('キャッシュ保存');
  };
  
  /** 条件を再取得する・失敗時は復元済みまたは取得済みの条件を保持する */
  const loadFilterRules = async (): Promise<boolean> => {
    status = 'starting';
    error = '';
    let nextToken = token ?? readToken();
    if(isEmpty(nextToken)) nextToken = window.prompt('Neo\'s YouTube Filter のトークンを入力してください');
    if(isEmpty(nextToken)) {
      status = 'idle';
      logger.log('トークン入力キャンセル・取得を中止');
      return false;
    }
    nextToken = String(nextToken).trim();
    if((/\s/).test(nextToken)) {
      status = filterRules == null ? 'error' : 'ready';
      notifyError('空白を含まないトークンを入力してください', 'トークン形式不正');
      return false;
    }
    logger.log('GET /filter-rules 開始');
    const response = await requestApi(`${apiUrl}/filter-rules`, nextToken);
    if(response.error != null) {
      status = filterRules == null ? 'error' : 'ready';
      notifyError('条件を取得できませんでした・既存の条件を保持します', response.error);
      return false;
    }
    logger.log(`GET /filter-rules HTTP ${response.result.status}`);
    if(response.result.status === 401) {
      token = null;
      if(readToken() === nextToken) {
        const removed = removeStorage(tokenStorageKey);
        if(removed.error != null) logger.error(removed.error);
      }
      status = 'unauthorized';
      notifyError('トークンが一致しません・再取得で入力し直してください', 'HTTP 401');
      return false;
    }
    if(response.result.status < 200 || response.result.status >= 300) {
      status = filterRules == null ? 'error' : 'ready';
      const responseBody = response.result.body;
      const detail = responseBody != null && typeof responseBody === 'object' && 'error' in responseBody && typeof responseBody.error === 'string' ? responseBody.error.replaceAll(nextToken, '[REDACTED]') : 'エラー本文なし';
      notifyError('条件を取得できませんでした・既存の条件を保持します', `HTTP ${response.result.status} : ${detail}`);
      return false;
    }
    const body = response.result.body;
    const parsed = filterRulesSchema.safeParse(body != null && typeof body === 'object' && 'result' in body ? body.result : null);
    if(!parsed.success) {
      status = filterRules == null ? 'error' : 'ready';
      notifyError('フィルター条件の応答形式が不正です・既存の条件を保持します', parsed.error.message);
      return false;
    }
    token = nextToken;
    filterRules = parsed.data;
    fetchedAt = new Date().toISOString();
    const stored = writeStorage(tokenStorageKey, token);
    if(stored.error != null) notifyError('トークンを保存できませんでした・次回は再入力が必要です', stored.error);
    saveCache();
    status = 'ready';
    logger.log(`条件取得完了 : 動画 ${filterRules.blocked_videos.length}・チャンネル ${filterRules.blocked_channels.length}・パターン ${filterRules.blocked_patterns.length}・購読 ${filterRules.subscribed_channels.length}`);
    onChange(filterRules);
    return true;
  };
  
  /** 再取得中は同じ `Promise` を返す */
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
    if(!parsed.success) {
      logger.error(`条件更新の入力不正 : ${parsed.error.message}`);
      return false;
    }
    filterRules = parsed.data;
    saveCache();
    onChange(filterRules);
    return true;
  };
  
  return {
    get status(): YtfRuntime['status'] { return status; },
    get filterRules(): FilterRules | null { return filterRules; },
    get fetchedAt(): string | null { return fetchedAt; },
    get error(): string { return error; },
    restoreCache,
    refresh,
    updateFilterRules
  };
};
