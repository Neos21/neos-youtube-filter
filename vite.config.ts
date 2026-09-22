import { cloudflare } from '@cloudflare/vite-plugin';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { reactRouterHonoServer } from 'react-router-hono-server/dev';
import { defineConfig } from 'vite';

/** Vite 設定 */
export default defineConfig({
  plugins: [
    // Vite に Cloudflare Workers ランタイムを統合するプラグイン https://developers.cloudflare.com/workers/vite-plugin/
    cloudflare({
      viteEnvironment: {
        name: 'ssr'
      }
    }),
    // TailwindCSS プラグイン
    tailwindcss(),
    // Hono + React Router 構成を認識させるプラグイン・`reactRouter()` より手前に置くこと
    reactRouterHonoServer({
      // ランタイム指定
      runtime: 'cloudflare',
      // Hono サーバのエントリポイント
      serverEntryPoint: './server/index.ts'
    }),
    // React Router プラグイン
    reactRouter()
  ],
  build: {
    rollupOptions: {
      // フロントエンドのビルド資材の命名ルールを変更する
      output: {
        entryFileNames: `assets/entry-[hash].js`,
        chunkFileNames: `assets/chunk-[hash].js`,
        assetFileNames: `assets/asset-[hash].[ext]`
      }
    }
  }
});
