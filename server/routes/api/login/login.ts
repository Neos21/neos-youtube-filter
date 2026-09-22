import { Hono } from 'hono';

import { httpStatusCode } from '../../../../shared/constants/http-status-code';

import type { HonoBindings } from '../../../types/hono-bindings';

export const login = new Hono<{ Bindings: HonoBindings; }>();
export const loginPath = '/login' as const;

/** API 共通の認証処理でトークンは照合済み */
login.post('/', context => context.json({ result: true }, httpStatusCode.ok));
