import type { YouTubePage } from '../types/youtube-page';

/** URL から探索対象を判定する・対象外ホストや Shorts 専用プレイヤーなどでは null を返す */
export const getYouTubePage = (url: URL): YouTubePage | null => {
  if(url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if(url.hostname !== 'www.youtube.com' && url.hostname !== 'm.youtube.com') return null;
  const site = url.hostname === 'm.youtube.com' ? 'mobile' : 'desktop';
  if(url.pathname === '/') return { site, type: 'home' };
  if(url.pathname === '/watch') return { site, type: 'watch' };
  if(url.pathname === '/results') return { site, type: 'search' };
  return null;
};
