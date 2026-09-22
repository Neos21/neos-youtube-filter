// Example : サーバでのみ使用する定数

/** リクエストボディが JSON として取得できない場合のエラーメッセージ */
export const invalidRequestBodyErrorMessage = 'リクエストボディが不正です' as const;
/** URL パラメータの ID が整数でない場合のエラーメッセージ */
export const invalidIdErrorMessage = 'ID が不正です' as const;
