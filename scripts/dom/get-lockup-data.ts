import { youTubeSelectors } from './youtube-selectors';

/** 参考タイトルが入る YouTube の内部表示モデルの部分構造 */
type LockupMetadata = {
  title?: { content?: unknown; };
  metadata?: { contentMetadataViewModel?: { metadataRows?: Array<{ metadataParts?: Array<{ text?: { content?: unknown; }; }>; }>; }; };
};

/**
 * 動画カードに対応する YouTube の内部表示モデルを取得する
 * 
 * PC の関連動画は親の `data.contents` に複数モデルがあるため、カードの動画 ID と一致する1件だけを返す
 * 
 * @returns 対応する表示モデル・取得できない場合は `null`
 */
export const getLockupData = (cardElement: HTMLElement): Record<string, unknown> | null => {
  const lockupElement = cardElement.matches('yt-lockup-view-model') ? cardElement : cardElement.querySelector<HTMLElement>('yt-lockup-view-model');
  let data: unknown = (lockupElement as HTMLElement & { data?: unknown; } | null)?.data;
  
  // PC の関連動画ではカード自身の `data` が使えず、親の `contents` から同じ動画 ID のモデルを探す
  if(data == null || typeof data !== 'object') {
    const sectionElement = cardElement.closest<HTMLElement>('ytd-item-section-renderer');
    const sectionData: unknown = (sectionElement as HTMLElement & { data?: unknown; } | null)?.data;
    const href = cardElement.querySelector<HTMLAnchorElement>(youTubeSelectors.videoLinks)?.getAttribute('href') ?? '';
    const videoId = href.match((/[?&]v=([A-Za-z0-9_-]{11})(?:[&#]|$)/))?.[1]
      ?? href.match((/\/shorts\/([A-Za-z0-9_-]{11})(?:[/?#]|$)/))?.[1];
    if(videoId != null && sectionData != null && typeof sectionData === 'object' && 'contents' in sectionData && Array.isArray(sectionData.contents)) {
      const content = sectionData.contents.find((item: unknown): boolean => {
        if(item == null || typeof item !== 'object' || !('lockupViewModel' in item)) return false;
        const model = item.lockupViewModel;
        return model != null && typeof model === 'object' && 'contentId' in model && model.contentId === videoId;
      });
      data = content?.lockupViewModel;
    }
  }
  
  return data != null && typeof data === 'object' ? data as Record<string, unknown> : null;
};

/** 内部表示モデルにある参考用の動画名・チャンネル名を取得し、取得できない名前は返さない */
export const getLockupTitles = (cardElement: HTMLElement): { videoTitle?: string; channelTitle?: string; } => {
  const data = getLockupData(cardElement);
  const metadata = (data?.metadata as { lockupMetadataViewModel?: LockupMetadata; } | undefined)?.lockupMetadataViewModel;
  const videoTitle = metadata?.title?.content;
  const channelTitle = metadata?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content;
  
  return {
    ...(typeof videoTitle === 'string' && videoTitle.trim() !== '' ? { videoTitle: videoTitle.trim() } : {}),
    ...(typeof channelTitle === 'string' && channelTitle.trim() !== '' ? { channelTitle: channelTitle.trim() } : {})
  };
};
