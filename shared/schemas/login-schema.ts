import z from 'zod';

import { preprocessOneLineString, zodErrorMessages } from './schema-utilities';

export const passwordDisplayName = 'パスワード' as const;

/** ログイン時のパスワード入力を正規化して検証するスキーマ */
export const loginSchema = z.object({
  password: z.preprocess(
              preprocessOneLineString,  // 単一行を整形する
              z.string({ error: zodErrorMessages.invalidType(passwordDisplayName) })
                .min(1, { error: zodErrorMessages.empty(passwordDisplayName) })
            )
});
