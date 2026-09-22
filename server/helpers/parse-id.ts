import { invalidIdErrorMessage } from '../constants/server-constants';

import type { Result } from '../../shared/types/utilities/result';

/**
 * URL パラメータの ID を検証して Number 型に変換する
 * 
 * @param value `context.req.param('id')` で取得した文字列
 * @returns 正の安全な整数なら変換した数値を返す
 *          未指定・数字以外・0・小数・指数表記・安全な整数の範囲外はエラーを返す
 */
export const parseId = (value: string | undefined): Result<number> => {
  if(value == null || !(/^[0-9]+$/).test(value)) return { error: invalidIdErrorMessage };
  
  const id = Number(value);
  if(!Number.isSafeInteger(id) || id < 1) return { error: invalidIdErrorMessage };
  
  return { result: id };
};
