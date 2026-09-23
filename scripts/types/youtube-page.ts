/** 動画カードを探索するページの種類を表す・Shorts 専用プレイヤーなどは対象外 */
export type YouTubePage = {
  /** PC 版かスマホ版か */
  site: 'desktop' | 'mobile';
  /** ホーム画面・動画ページ・検索結果ページ */
  type: 'home' | 'watch' | 'search';
};
