/** DB の真偽値を数値で扱う型 (循環参照を避けるためベタ書き) */
export type BooleanNumber = 0 | 1;

/** フォーム入力で {@link BooleanNumber} 相当の値を文字列として扱う型 */
export type BooleanString = `${BooleanNumber}`;
