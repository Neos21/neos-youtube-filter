import type { FilterRules } from '../../shared/types/app/filter-rules';

/** ページ内で共有する起動状態・トークン自体は公開しない */
export type YtfRuntime = {
  /** idle は入力キャンセル、starting は取得中、ready は条件利用可、error は条件なしの取得失敗、unauthorized は再認証が必要 */
  readonly status: 'idle' | 'starting' | 'ready' | 'error' | 'unauthorized';
  /** 最後に取得・復元できた条件・null は条件未取得であり空の4配列とは区別する */
  readonly rules: FilterRules | null;
  /** 現在の条件を API から取得した日時・null は未取得 */
  readonly fetchedAt: string | null;
  /** 取得・保存の失敗理由・空文字はエラーなし */
  readonly error: string;
  /** API から再取得する・対象ページ遷移時などの呼び出し用 */
  refresh: () => Promise<boolean>;
  /** 登録成功後の条件をメモリとキャッシュへ反映する・取得日時は維持する */
  updateRules: (rules: FilterRules) => boolean;
};

declare global {
  interface Window {
    /** メインスクリプトの重複ロード・重複初期化を防ぐ共有入口 */
    __YTF__?: YtfRuntime;
  }
}
