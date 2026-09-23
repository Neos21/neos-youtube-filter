/** 捕捉した例外の種類とメッセージをログ用の文字列にする */
export const describeError = (error: unknown): string => error instanceof Error ? `${error.name}: ${error.message}` : String(error);
