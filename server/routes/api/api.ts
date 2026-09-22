import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { blockedVideos, blockedVideosPath } from './blocked-videos/blocked-videos';
import { login, loginPath } from './login/login';
import { httpStatusCode } from '../../../shared/constants/http-status-code';
import { isEmpty } from '../../../shared/helpers/is-empty';

import type { HonoBindings } from '../../types/hono-bindings';

export const api = new Hono<{ Bindings: HonoBindings; }>();
export const apiPath = '/api' as const;

// CORS を許可する
api.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}));

// CORS が OPTIONS を処理した後、ログイン確認を含む全 API にトークン認証を適用する
api.use('*', async (context, next) => {
  const apiToken = context.env.API_TOKEN;
  if(isEmpty(apiToken)) return context.json({ error: '認証設定に問題があります' }, httpStatusCode.internalServerError);
  
  const authorization = context.req.header('Authorization');
  const match = authorization?.match((/^Bearer ([^\s]+)$/i));
  if(match == null || match[1] !== apiToken) return context.json({ error: 'トークンが一致しません' }, httpStatusCode.unauthorized);
  
  await next();
});

api.route(loginPath        , login);
api.route(blockedVideosPath, blockedVideos);

// TODO : テスト用・後で消す
api.get('/test', context => {
  return context.json({ result: 'TEST GET OK' });
});

// TODO : テスト用・後で消す
api.post('/test', context => {
  return context.json({ result: 'TEST POST OK' });
});
