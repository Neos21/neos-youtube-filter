import { Hono } from 'hono';

import { examples, examplesPath } from './examples/examples';
import { login, loginPath } from './login/login';

import type { HonoBindings } from '../../types/hono-bindings';

export const api = new Hono<{ Bindings: HonoBindings; }>();
export const apiPath = '/api' as const;  // エンドポイントパスをインスタンスと同じ位置から `export` することで命名の散在を防ぐ

api.route(loginPath   , login);
api.route(examplesPath, examples);
