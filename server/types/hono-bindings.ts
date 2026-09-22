/** Hono Context から参照する Cloudflare Workers の Binding */
export type HonoBindings = {
  /** Cloudflare D1 データベース */
  DB: D1Database;
  
  /** ログインパスワード */
  ADMIN_PASSWORD: string;
  /** JWT シークレット */
  ADMIN_JWT_SECRET: string;
};
