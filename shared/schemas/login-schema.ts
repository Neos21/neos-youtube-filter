import z from 'zod';

import { preprocessOneLineString } from './schema-utilities';

/** ログイン時のパスワード入力を正規化して検証するスキーマ */
export const loginSchema = z.object({
  password: z.preprocess(
              preprocessOneLineString,
              z.string().min(1, { error: 'パスワードを入力してください' })
            )
});
