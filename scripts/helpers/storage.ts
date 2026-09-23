import { describeError } from './describe-error';

import type { Result } from '../../shared/types/utilities/result';

/** LocalStorage の文字列 (未保存なら `null`) を取得する */
export const readStorage = (key: string): Result<string | null> => {
  try {
    return { result: localStorage.getItem(key) };
  }
  catch(error) {
    return { error: `LocalStorage 読込失敗 (${key}) : ${describeError(error)}` };
  }
};

/** LocalStorage に文字列を保存する・容量不足などの場合はエラーが返される */
export const writeStorage = (key: string, value: string): Result<true> => {
  try {
    localStorage.setItem(key, value);
    return { result: true };
  }
  catch(error) {
    // 値自体はエラーメッセージに含めないようにする
    const detail = value === '' ? describeError(error) : describeError(error).replaceAll(value, '[REDACTED]');
    return { error: `LocalStorage 保存失敗 (${key}) : ${detail}` };
  }
};

/** LocalStorage の指定キーを削除する・未保存でも成功扱いとなる */
export const removeStorage = (key: string): Result<true> => {
  try {
    localStorage.removeItem(key);
    return { result: true };
  }
  catch(error) {
    return { error: `LocalStorage 削除失敗 (${key}) : ${describeError(error)}` };
  }
};
