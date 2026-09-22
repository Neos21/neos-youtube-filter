/** Hono Context から参照する Cloudflare Workers の Binding */
export type HonoBindings = {
  /** Cloudflare D1 データベース */
  DB: D1Database;
  
  /** 管理画面とメインスクリプトで共用する Bearer トークン */
  API_TOKEN: string;
};
