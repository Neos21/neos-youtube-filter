/** 例外を使用せず正常系・異常系を表現するための型 */
export type Result<T> = {
  /** 処理結果 */
  result: T;
  /** 正常時はエラーメッセージを持たない */
  error?: never;
} | {
  /** 異常時は正常結果を持たない */
  result?: never;
  /** エラーメッセージ */
  error: string;
};
