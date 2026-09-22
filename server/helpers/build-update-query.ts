/** SQL の `UPDATE` 文を構築するための1カラム分の情報 */
type UpdateField = {
  /** カラム名 */
  column: string;
  /** `UPDATE` 文に反映する実際の値 */
  value: unknown;
  /** 対象のカラムを `UPDATE` 文に含めるか否かを判定する独自の関数があれば指定する */
  shouldInclude?: (value: unknown) => boolean;
};

/** 更新対象フィールドから `UPDATE` 文の SET 句と、同じ順序で Bind する値を組み立てる */
export const buildUpdateQuery = (fields: Array<UpdateField>): { sets: Array<string>; values: Array<unknown>; } => {
  // 「カラム名 = ?」の形で `UPDATE` SQL 文を組み立てる
  const sets: Array<string> = [];
  // Bind する実際の値を格納する
  const values: Array<unknown> = [];
  
  for(const field of fields) {
    // 判定関数が渡されていればそれを利用する・デフォルトでは `undefined`・`null` でなければ対象のカラムを UPDATE 文に追加する
    const shouldInclude = field.shouldInclude ?? ((value: unknown): boolean => value != null);
    if(shouldInclude(field.value)) {
      sets.push(`${field.column} = ?`);
      values.push(field.value);
    }
  }
  
  return { sets, values };
};
