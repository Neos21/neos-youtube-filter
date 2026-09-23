import { getYouTubePage } from './get-youtube-page';
import { youTubeSelectors } from './youtube-selectors';
import { isEmpty } from '../../shared/helpers/is-empty';

import type { YouTubeCard } from '../types/youtube-card';

/** 候補を優先順に調べ、空でない表示文字列を返す・説明文や視聴回数はタイトルに混ぜない */
const readText = (element: Element, selectors: Array<string>): string | null => {
  for(const selector of selectors) {
    const target = element.querySelector(selector);
    const text = target?.textContent?.trim();
    if(!isEmpty(text)) return text!;
    const title = target?.getAttribute('title')?.trim();
    if(!isEmpty(title)) return title!;
  }
  return null;
};

/** 不正な `href` や空の属性は未取得として扱う */
const parseUrl = (value: string | null, baseUrl: URL): URL | null => {
  if(isEmpty(value)) return null;
  try {
    const url = new URL(value!, baseUrl);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  }
  catch {
    return null;
  }
};

/** YouTube の動画リンクだけを読み取る・外部サイトの同名パラメータは採用しない */
const readVideoId = (url: URL): string | null => {
  if(!['www.youtube.com', 'm.youtube.com', 'youtube.com'].includes(url.hostname)) return null;
  const value = url.pathname === '/watch' ? url.searchParams.get('v') : url.pathname.match((/^\/(?:shorts|live)\/([\w-]{11})\/?$/))?.[1];
  return value != null && (/^[\w-]{11}$/).test(value) ? value : null;
};

/**
 * 投稿者用リンクから識別子を読み取る
 * 
 * 複数のハンドルや ID が混在するカードは誤った紐付けを避けるため両方 `null` とする
 * URL に含まれない識別子をチャンネル名や YouTube 内部の JavaScript オブジェクトから推測しない
 */
const readChannel = (element: Element, baseUrl: URL): Pick<YouTubeCard, 'handle' | 'channelId'> => {
  const handles = new Set<string>();
  const channelIds = new Set<string>();
  for(const link of element.querySelectorAll(youTubeSelectors.channelLinks.join(', '))) {
    const url = parseUrl(link.getAttribute('href'), baseUrl);
    if(url == null || !['www.youtube.com', 'm.youtube.com', 'youtube.com'].includes(url.hostname)) continue;
    let pathname: string;
    try {
      pathname = decodeURIComponent(url.pathname);
    }
    catch {
      continue;
    }
    const handle = pathname.match((/^\/(@[^/\s]+)(?:\/|$)/))?.[1];
    const channelId = pathname.match((/^\/channel\/(UC[\w-]{22})(?:\/|$)/))?.[1];
    if(handle != null) handles.add(handle.toLowerCase());
    if(channelId != null) channelIds.add(channelId);
  }
  if(handles.size > 1 || channelIds.size > 1) return { handle: null, channelId: null };
  return { handle: [...handles][0] ?? null, channelId: [...channelIds][0] ?? null };
};

/** 個別カードを抽出する・動画 ID 不明、複数動画を含む棚、コレクションは `null` とする */
const extractCard = (element: HTMLElement, baseUrl: URL): YouTubeCard | null => {
  if(element.closest(youTubeSelectors.excluded) != null || element.querySelector(youTubeSelectors.containers) != null) return null;
  const thumbnailElement = element.querySelector<HTMLElement>(youTubeSelectors.thumbnails.join(', '));
  const image = thumbnailElement?.querySelector('img');
  const thumbnailUrl = parseUrl(image?.getAttribute('src') ?? image?.getAttribute('data-src') ?? null, baseUrl);
  const videoIds = new Set<string>();
  let isShort = element.matches(youTubeSelectors.shorts) || element.querySelector(youTubeSelectors.shorts) != null;
  for(const link of element.querySelectorAll([...youTubeSelectors.thumbnails, ...youTubeSelectors.videoLinks].join(', '))) {
    const url = parseUrl(link.getAttribute('href'), baseUrl);
    if(url == null) continue;
    const videoId = readVideoId(url);
    if(videoId == null) continue;
    videoIds.add(videoId);
    if(url.pathname.startsWith('/shorts/')) isShort = true;
  }
  // Shorts のリンクが動画 URL でなくても、動画サムネイルの URL から ID を取得できる
  if(videoIds.size === 0 && isShort && thumbnailUrl != null && (/(^|\.)ytimg\.com$/).test(thumbnailUrl.hostname)) {
    const videoId = thumbnailUrl.pathname.match((/^\/vi(?:_webp)?\/([\w-]{11})\//))?.[1];
    if(videoId != null) videoIds.add(videoId);
  }
  if(videoIds.size !== 1) return null;
  return {
    element,
    thumbnailElement,
    thumbnailUrl: thumbnailUrl?.href ?? null,
    videoId: [...videoIds][0],
    title: readText(element, youTubeSelectors.titles),
    channelName: readText(element, youTubeSelectors.channelNames),
    ...readChannel(element, baseUrl),
    isShort
  };
};

/**
 * 現在のページから個別の動画カードを取得する・DOM の変更や通信は行わない
 * 
 * 同じ動画の別カードは保持し、`rich-item` と内側の `lockup` の重複だけを外側のカードにまとめる
 * 
 * @param document 探索する DOM・YouTube の追加描画後は同じ `document` で再度呼び出す
 * @param url DOM に対応するページ URL・対象外ページでは空配列を返す
 * @returns 取得時点のカード一覧・動画 ID が取得不能なカードは含めず、その他の未取得項目は `null` とする
 */
export const extractYouTubeCards = (document: Document, url: URL): Array<YouTubeCard> => {
  const page = getYouTubePage(url);
  if(page == null) return [];
  const elements = new Set<HTMLElement>();
  for(const root of document.querySelectorAll(youTubeSelectors.roots[page.site][page.type])) {
    for(const element of root.querySelectorAll<HTMLElement>(youTubeSelectors.cards.join(', '))) elements.add(element);
  }
  const cards = [...elements].map(element => extractCard(element, url)).filter(card => card != null);
  return cards.filter(card => !cards.some(parent => parent !== card && parent.element.contains(card.element)));
};
