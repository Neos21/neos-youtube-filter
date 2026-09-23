import { describeError } from './describe-error';
import { apiBaseUrl, apiTimeoutMilliseconds } from '../constants';

import type { Result } from '../../shared/types/utilities/result';
import type { Logger } from '../ui/create-menu';

/**
 * 定数 `apiBaseUrl` の接続先に、指定されたトークンで通信するリクエスト関数を作る
 * 
 * 起動側が一度生成し、返された関数を `requestApi('/filter-rules')` のように呼ぶ
 * GET と後続の PUT で認証・ログ・エラー処理を共有し、再入力や自動再試行はしない
 * 
 * @param token 起動時に取得した Bearer トークン・返された関数の内部で保持する
 * @param logger 通信の開始・終了・HTTP ステータスを出力するログ機能
 * @param onUnauthorized 401 を受けた時に呼ぶ終了処理・起動側が監視停止とトークン削除を行う
 * @returns パス・メソッド・任意の送信本文を受け取る非同期関数・成功時は応答 JSON 全体、失敗時はエラーメッセージを `Result` に入れて返す
 */
export const createApiClient = (token: string, logger: Logger, onUnauthorized: () => void): (path: string, method?: 'GET' | 'PUT', body?: unknown) => Promise<Result<unknown>> => {
  /** 認証失敗を一度受けたか否か・`true` になった後の呼び出しは通信せずエラーを返す */
  let isUnauthorized = false;
  
  /** API リクエストを1回実行する・応答の業務データの Schema 検証とエラー表示は呼び出し側が行う */
  return async (path: string, method = 'GET', body?: unknown): Promise<Result<unknown>> => {
    if(isUnauthorized) return { error: '認証失敗により停止中です・ページを再読み込みしてください' };
    
    /** このリクエストの Fetch と応答本文の読込を中断するための制御オブジェクト */
    const controller = new AbortController();
    /** 通信の上限時間を過ぎたら中断するタイマー・成功/失敗にかかわらず終了時に解除する */
    const timeout = setTimeout(() => controller.abort(), apiTimeoutMilliseconds);
    
    logger.log(`${method} ${path} 開始`);
    try {
      const response = await fetch(`${apiBaseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, ...(body == null ? {} : { 'Content-Type': 'application/json' }) },
        body: body == null ? undefined : JSON.stringify(body),
        credentials: 'omit',
        redirect: 'error',
        cache: 'no-store',
        signal: controller.signal
      });
      logger.log(`${method} ${path} HTTP ${response.status}`);
      
      if(response.status === 401) {
        isUnauthorized = true;
        onUnauthorized();
        return { error: 'トークンが一致しません・ページを再読み込みしてください' };
      }
      
      /** レスポンス JSON・スキーマ検証などは呼び出し側に任せる */
      let responseBody: unknown;
      try {
        responseBody = await response.json();
      }
      catch(error) {
        return { error: `HTTP ${response.status} 応答読込失敗 : ${describeError(error).replaceAll(token, '[REDACTED]')}` };
      }
      
      if(!response.ok) {
        const detail = responseBody != null && typeof responseBody === 'object' && 'error' in responseBody ? String(responseBody.error).replaceAll(token, '[REDACTED]') : 'エラー本文なし';
        return { error: `HTTP ${response.status} : ${detail}` };
      }
      
      return { result: responseBody };
    }
    catch(error) {
      return { error: `API 通信失敗 : ${describeError(error).replaceAll(token, '[REDACTED]')}` };
    }
    finally {
      clearTimeout(timeout);
      logger.log(`${method} ${path} 終了`);
    }
  };
};
