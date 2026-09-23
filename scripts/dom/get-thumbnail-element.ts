import { youTubeSelectors } from './youtube-selectors';

/**
 * カード内で登録ボタンを重ねるサムネイル要素を探す
 * 
 * 専用のサムネイル要素を優先し、ない場合は画像を含む動画リンクを使う
 * 動画 ID やチャンネル識別子の有無は、各登録処理が別途確認する
 */
export const getThumbnailElement = (cardElement: HTMLElement): HTMLElement | null => cardElement.querySelector<HTMLElement>(youTubeSelectors.thumbnails) ?? cardElement.querySelector<HTMLElement>(youTubeSelectors.thumbnailLinks);
