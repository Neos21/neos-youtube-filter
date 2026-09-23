/** 動画カードを探索するページ・Shorts 専用プレイヤーなどは対象外 */
export type YouTubePage = {
  site: 'desktop' | 'mobile';
  type: 'home' | 'watch' | 'search';
};
