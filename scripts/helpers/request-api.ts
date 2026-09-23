import { describeError } from './describe-error';

import type { Result } from '../../shared/types/utilities/result';

/** HTTP 応答・通信失敗と区別し、呼び出し側で認証失敗などを判定する */
type ApiResponse = {
  status: number;
  body: unknown;
};

/**
 * Bearer 付き API 呼び出し・タイムアウトと応答の読込までを担当する
 * 
 * HTTP エラーはステータス付きの結果、通信・JSON 読込失敗は `Result` のエラーとして返す
 * トークンや送信本文はログに出さず、例外メッセージにトークンが含まれる場合も除去する
 */
export const requestApi = async (url: string, token: string, method = 'GET', body?: unknown): Promise<Result<ApiResponse>> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body == null ? {} : { 'Content-Type': 'application/json' }) },
      body: body == null ? undefined : JSON.stringify(body),
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      signal: controller.signal
    });
    let responseBody: unknown = null;
    try {
      responseBody = await response.json();
    }
    catch(error) {
      // エラー応答が HTML や空の本文でも、HTTP ステータスは呼び出し側に返す
      if(response.ok) throw error;
    }
    return { result: { status: response.status, body: responseBody } };
  }
  catch(error) {
    return { error: `${method} API 通信・応答読込失敗 : ${describeError(error).replaceAll(token, '[REDACTED]')}` };
  }
  finally {
    clearTimeout(timeout);
  }
};
