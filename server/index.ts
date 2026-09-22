import { Hono } from 'hono';
import { createHonoServer } from 'react-router-hono-server/cloudflare';

import { api, apiPath } from './routes/api/api';

import type { HonoBindings } from './types/hono-bindings';

export const app = new Hono<{ Bindings: HonoBindings; }>();

app.route(apiPath, api);  // `routes/` ディレクトリ配下は URI パスとディレクトリ階層を揃えるため `/api` 配下からクラスを分けて作る

/**
 * `wrangler.jsonc` や `vite.config.ts` にてエントリポイントと識別するため Default Export が必須
 * 
 * 以下のように記述することで `/api` 配下へのリクエストに到達できるようにする
 */
export default await createHonoServer({ app });
