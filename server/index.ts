import { createHonoServer } from 'react-router-hono-server/cloudflare';

import { api, apiPath } from './routes/api/api';

/**
 * `wrangler.jsonc` や `vite.config.ts` にてエントリポイントと識別するため Default Export が必須
 * 
 * NOTE : `$ vite dev` コマンドで認識させるため `createHonoServer()` でのラップが必要・以下のようなコードでは動かない
 * 
 * ```typescript
 * import { Hono } from 'hono';
 * import type { HonoBindings } from './types/hono-bindings';
 * const app = new Hono<{ Bindings : HonoBindings; }>();
 * app.route(apiPath, api);
 * export default app;
 * ```
 */
export default await createHonoServer({
  configure(app) {
    app.route(apiPath, api);  // `routes/` ディレクトリ配下は URI パスとディレクトリ階層を揃えるため `/api` 配下からクラスを分けて作る
  }
});
