import type { BooleanNumber } from '../utilities/boolean-types';

/** Example : `examples` テーブルの1レコードに相当する型定義 */
export type Example = {
  /** ID */
  id: number;
  /** 必須入力項目のサンプル */
  name: string;
  /** 自由記入項目のサンプル : DB 上の未設定値は `null`、部分更新時に項目を更新対象に含めない場合は `undefined` */
  memo: string | null | undefined;
  /** 有効・無効のような Boolean での状態を表すサンプル : SQLite には Boolean 型がなく 0・1 で示すため専用型を用意している */
  is_active: BooleanNumber;
};
