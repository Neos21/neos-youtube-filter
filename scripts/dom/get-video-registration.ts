import { youTubeSelectors } from './youtube-selectors';

/** 動画登録に使う識別子と参考タイトル・タイトルが取れない場合は省略して既存の保存値を保持する */
export type VideoRegistration = {
  /** YouTube の動画 ID・リンクまたはサムネイル URL から取得する */
  video_id: string;
  /** カードに表示されている動画タイトル・取得できない場合は `undefined` */
  title?: string;
};

/**
 * カードから登録用の動画情報とボタンの配置先を取得する
 * 
 * 動画リンクを優先し、Shorts などリンクから ID が取れない場合はサムネイル URL を調べる
 * タイトルは表示テキストから取り、視聴回数などを含む `aria-label` は使用しない
 * 
 * @returns 動画情報とサムネイルの要素・動画 ID または配置先が取得できない場合は `null`
 */
export const getVideoRegistration = (cardElement: HTMLElement): { video: VideoRegistration; thumbnailElement: HTMLElement; } | null => {
  const thumbnailElement = cardElement.querySelector<HTMLElement>(youTubeSelectors.thumbnails) ?? cardElement.querySelector<HTMLElement>(youTubeSelectors.thumbnailLinks);
  if(thumbnailElement == null) return null;
  
  /** 登録対象の動画 ID・通常動画と Shorts のリンクを先に調べる */
  let videoId: string | undefined;
  for(const linkElement of cardElement.querySelectorAll<HTMLAnchorElement>(youTubeSelectors.videoLinks)) {
    const href = linkElement.getAttribute('href') ?? '';
    videoId = href.match((/[?&]v=([A-Za-z0-9_-]{11})(?:[&#]|$)/))?.[1]
      ?? href.match((/\/shorts\/([A-Za-z0-9_-]{11})(?:[/?#]|$)/))?.[1];
    if(videoId != null) break;
  }
  
  // リンクがない Shorts でも、動画サムネイルの URL に ID があれば登録できる
  if(videoId == null) {
    for(const imageElement of thumbnailElement.querySelectorAll('img')) {
      const source = imageElement.getAttribute('src') || imageElement.getAttribute('data-src') || '';
      videoId = source.match((/\/vi(?:_webp)?\/([A-Za-z0-9_-]{11})\//))?.[1];
      if(videoId != null) break;
    }
  }
  if(videoId == null) return null;
  
  const titleElement = cardElement.querySelector(youTubeSelectors.videoTitles);
  const title = (titleElement?.getAttribute('title') || titleElement?.textContent || '').trim();
  return { video: { video_id: videoId, ...(title === '' ? {} : { title }) }, thumbnailElement };
};
