/** 例外を使用せず正常系・異常系を表現するための型 */
export type Result<T> = {
  /** 正常時の処理結果 */
  result: T;
  /** 正常時はエラー情報を持たない */
  error?: undefined;
  /** 正常時の HTTP ステータスコードは Controller が決定する */
  httpStatusCode?: undefined;
} | {
  /** 異常時は正常結果を持たない */
  result?: undefined;
  /** クライアントに返すエラーメッセージ */
  error: string;
  /** 異常の種類に対応する HTTP ステータスコード・省略時は Controller が Bad Request として扱う */
  httpStatusCode?: number;
};
