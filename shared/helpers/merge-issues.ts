import type { ZodError } from 'zod';

/** Zod のエラーメッセージを中黒「・」で連結して返す */
export const mergeIssues = (zodError: ZodError): string => zodError.issues.map(issue => issue.message).join('・');
