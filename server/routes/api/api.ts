import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { login, loginPath } from './login/login';

import type { HonoBindings } from '../../types/hono-bindings';

export const api = new Hono<{ Bindings: HonoBindings; }>();
export const apiPath = '/api' as const;  // エンドポイントパスをインスタンスと同じ位置から `export` することで命名の散在を防ぐ

api.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}));

api.route(loginPath   , login);
//api.route(examplesPath, examples);

api.get('/test', context => {
  return context.json({ result: 'TEST GET OK' });
});

api.post('/test', context => {
  return context.json({ result: 'TEST POST OK' });
});
