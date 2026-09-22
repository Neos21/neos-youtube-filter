import { Hono } from 'hono';
import { sign } from 'hono/jwt';

import { httpStatusCode } from '../../../../shared/constants/http-status-code';
import { isEmpty } from '../../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { loginSchema } from '../../../../shared/schemas/login-schema';
import { invalidRequestBodyErrorMessage } from '../../../constants/server-constants';

import type { HonoBindings } from '../../../types/hono-bindings';

export const login = new Hono<{ Bindings: HonoBindings; }>();
export const loginPath = '/login' as const;

/** パスワードを検証して認証トークンを発行する */
login.post('/', async context => {
  // エラー理由を正直にレスポンスすると脆弱性に繋がるためレスポンスメッセージは濁しておく
  if(isEmpty(context.env.ADMIN_PASSWORD) || isEmpty(context.env.ADMIN_JWT_SECRET)) return context.json({ error: 'エラーが発生しました' }, httpStatusCode.internalServerError);
  
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  const parsed = loginSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  if(parsed.data.password !== context.env.ADMIN_PASSWORD) return context.json({ error: 'パスワードが一致しません' }, httpStatusCode.unauthorized);
  
  const now = Math.floor(Date.now() / 1000);
  const tokenExpiresInSeconds = 60 * 60 * 24 * 30;  // 30日間
  const token = await sign({ exp: now + tokenExpiresInSeconds, iat: now }, context.env.ADMIN_JWT_SECRET, 'HS256');
  return context.json({ result: { token } }, httpStatusCode.ok);
});
