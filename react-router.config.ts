import type { Config } from '@react-router/dev/config';

/** React Router 設定 */
export default {
  // クライアントのディレクトリを指定する (デフォルトは `app` ディレクトリ)
  appDirectory: 'client',
  // SSR を無効にし SPA モードで実行する (デフォルトは `true`)
  ssr: false
} satisfies Config;
