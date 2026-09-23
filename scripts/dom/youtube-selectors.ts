/**
 * 動画カードの探索範囲、個別カード、除外する要素を定義した CSS セレクタ集
 * 
 * `createPageFilter()` がページの種類に応じて使い分ける・YouTube の DOM 変更時はこの定義を見直す
 * 関連動画の探索範囲を `document` 全体に広げないことで、再生中動画やコメントを除外する
 */
export const youTubeSelectors = {
  /** ページの種類ごとにカードを探す領域・この領域の中にあるカードだけを非表示判定の対象にする */
  roots: {
    /** PC 版の探索範囲 */
    desktop: {
      /** ホームのおすすめ動画一覧 */
      home  : 'ytd-browse[page-subtype="home"] ytd-rich-grid-renderer',
      /** 動画ページの関連動画欄・再生中の動画や操作欄を含めない */
      watch : 'ytd-watch-next-secondary-results-renderer',
      /** 検索結果の一覧 */
      search: 'ytd-search'
    },
    /** モバイル版の探索範囲 */
    mobile: {
      /** モバイルのホーム動画一覧 */
      home  : 'ytm-browse ytm-rich-grid-renderer',
      /** モバイルの動画ページにある関連動画欄 */
      watch : 'ytm-watch ytm-item-section-renderer[section-identifier="related-items"]',
      /** モバイルの検索結果一覧 */
      search: 'ytm-search'
    }
  },
  /** 個別の通常動画・Shorts カードの候補・入れ子で複数一致した場合は収集処理で1枚にまとめる */
  cards: [
    'ytd-rich-item-renderer', 'ytd-video-renderer', 'ytd-grid-video-renderer', 'ytd-compact-video-renderer',
    'yt-lockup-view-model', 'ytm-rich-item-renderer', 'ytm-video-with-context-renderer', 'ytm-compact-video-renderer',
    'ytm-shorts-lockup-view-model-v2', 'ytm-shorts-lockup-view-model', 'ytd-reel-item-renderer', 'ytm-reel-item-renderer'
  ],
  /** 動画 ID を取得するリンク・通常動画と Shorts のどちらも対象にする */
  videoLinks: 'a[href*="watch?"], a[href*="/shorts/"]',
  /** ボタンを重ねるサムネイル領域 */
  thumbnails: 'ytd-thumbnail, yt-thumbnail-view-model, ytm-thumbnail-cover, .shortsLockupViewModelHostThumbnailContainer, .shortsLockupViewModelHostThumbnailParentContainer',
  /** 専用のサムネイル領域がない場合の配置先・チャンネル画像のリンクは含めない */
  thumbnailLinks: 'a[href*="watch?"]:has(img), a[href*="/shorts/"]:has(img)',  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  /** 参考タイトルを取得する要素・メタ情報を含むカード全体のテキストは使用しない */
  videoTitles: '#video-title, h3, .shortsLockupViewModelHostMetadataTitle',
  /** 非表示判定から除外する要素・カード自身または祖先が一致した場合に除外する */
  excludes: '[hidden], ytd-ad-slot-renderer, ytm-ad-slot-renderer, ytd-promoted-sparkles-web-renderer, ytd-display-ad-renderer, ytd-playlist-panel-renderer, ytm-playlist-panel-renderer, yt-collection-thumbnail-view-model, ytd-comments, ytm-comment-section-renderer, #movie_player, #player',
  /** 複数動画をまとめた棚・コレクションの要素・これを子孫に含むカード候補は1枚の動画として扱わない */
  containers: 'ytd-rich-shelf-renderer, ytd-reel-shelf-renderer, ytm-reel-shelf-renderer, grid-shelf-view-model, yt-collection-thumbnail-view-model'
};
