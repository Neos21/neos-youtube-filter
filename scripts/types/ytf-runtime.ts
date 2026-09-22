/** ページ内で共有する起動状態・トークン自体は公開しない */
export type YtfRuntime = {
  /** `idle` は未起動または入力キャンセル、`starting` は認証中、`ready` は認証済み、`error` は起動失敗 */
  readonly status: 'idle' | 'starting' | 'ready' | 'error';
};

declare global {
  interface Window {
    /** メインスクリプトの重複ロード・重複初期化を防ぐ共有入口 */
    __YTF__?: YtfRuntime;
  }
}
