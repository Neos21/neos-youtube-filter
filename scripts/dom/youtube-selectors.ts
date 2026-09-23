/**
 * YouTube の DOM 変更に合わせて修正する探索候補
 * 
 * 配列の項目は優先順・ページの探索範囲と個別カードの抽出項目を分けて管理する
 * 関連動画の探索範囲を `document` 全体に広げないことで、再生中動画やコメントを除外する
 */
export const youTubeSelectors = {
  roots: {
    desktop: {
      home  : 'ytd-browse[page-subtype="home"] ytd-rich-grid-renderer',
      watch : 'ytd-watch-next-secondary-results-renderer',
      search: 'ytd-search'
    },
    mobile: {
      home  : 'ytm-browse ytm-rich-grid-renderer',
      watch : 'ytm-watch ytm-item-section-renderer[section-identifier="related-items"]',
      search: 'ytm-search'
    }
  },
  cards: [
    'ytd-rich-item-renderer', 'ytd-video-renderer', 'ytd-grid-video-renderer', 'ytd-compact-video-renderer',
    'yt-lockup-view-model', 'ytm-rich-item-renderer', 'ytm-video-with-context-renderer', 'ytm-compact-video-renderer',
    'ytm-shorts-lockup-view-model-v2', 'ytm-shorts-lockup-view-model', 'ytd-reel-item-renderer', 'ytm-reel-item-renderer'
  ],
  shorts: 'ytm-shorts-lockup-view-model-v2, ytm-shorts-lockup-view-model, ytd-reel-item-renderer, ytm-reel-item-renderer, [data-style="SHORTS"]',
  /** 前ページの非表示 DOM、広告、プレイリスト、コメント、プレイヤー内は探索しない */
  excluded: '[hidden], ytd-ad-slot-renderer, ytm-ad-slot-renderer, ytd-promoted-sparkles-web-renderer, ytd-display-ad-renderer, ytd-playlist-panel-renderer, ytm-playlist-panel-renderer, yt-collection-thumbnail-view-model, ytd-comments, ytm-comment-section-renderer, #movie_player, #player',
  /** 棚・コレクション全体を動画1件のカードとして扱わない */
  containers: 'ytd-rich-shelf-renderer, ytd-reel-shelf-renderer, ytm-reel-shelf-renderer, grid-shelf-view-model, yt-collection-thumbnail-view-model',
  thumbnails: ['a#thumbnail', 'a.ytLockupViewModelContentImage', 'a.media-item-thumbnail-container', 'a.shortsLockupViewModelHostEndpoint', 'a.reel-item-endpoint'],
  videoLinks: ['a#video-title', 'a#video-title-link', 'a.ytLockupMetadataViewModelTitle', 'a.shortsLockupViewModelHostOutsideMetadataEndpoint', '.media-item-metadata > a'],
  titles: ['#video-title', '#video-title-link', '.ytLockupMetadataViewModelTitle', '.shortsLockupViewModelHostInlineMetadata .shortsLockupViewModelHostMetadataTitle', '.shortsLockupViewModelHostOutsideMetadataEndpoint', '.media-item-headline', '.reel-item-headline'],
  channelLinks: ['ytd-channel-name a[href]', 'a#channel-thumbnail[href]', 'ytw-channel-thumbnail-with-link-renderer a[href]', '.ytLockupMetadataViewModelMetadata a[href]', '.media-item-byline a[href]'],
  channelNames: ['ytd-channel-name', '.shortsLockupViewModelHostOutsideMetadataTitleHasInlineMetadata .shortsLockupViewModelHostOutsideMetadataEndpoint', '.ytmBadgeAndBylineRendererItemByline', '.media-item-byline', '.ytContentMetadataViewModelMetadataRow:first-child .ytContentMetadataViewModelMetadataText']
};
