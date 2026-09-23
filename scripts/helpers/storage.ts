import { describeError } from './describe-error';

import type { Result } from '../../shared/types/utilities/result';

/** LocalStorage の値を取得する・未保存は `null`、利用不可はエラーとして返す */
export const readStorage = (key: string): Result<string | null> => {
  try {
    return { result: localStorage.getItem(key) };
  }
  catch(error) {
    return { error: `LocalStorage 読込失敗 (${key}) : ${describeError(error)}` };
  }
};

/** LocalStorage に文字列を保存する・値自体はエラーメッセージに含めない */
export const writeStorage = (key: string, value: string): Result<true> => {
  try {
    localStorage.setItem(key, value);
    return { result: true };
  }
  catch(error) {
    const detail = value === '' ? describeError(error) : describeError(error).replaceAll(value, '[REDACTED]');
    return { error: `LocalStorage 保存失敗 (${key}) : ${detail}` };
  }
};

/** LocalStorage の値を削除する・未保存の場合も成功として返す */
export const removeStorage = (key: string): Result<true> => {
  try {
    localStorage.removeItem(key);
    return { result: true };
  }
  catch(error) {
    return { error: `LocalStorage 削除失敗 (${key}) : ${describeError(error)}` };
  }
};
