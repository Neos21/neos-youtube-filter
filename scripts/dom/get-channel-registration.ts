import { getChannelIdentifiersFromData } from './get-channel-identifiers-from-data';
import { getLockupTitles } from './get-lockup-data';
import { getThumbnailElement } from './get-thumbnail-element';
import { youTubeSelectors } from './youtube-selectors';

/** カードにある確認済みのチャンネル識別子と参考タイトル・不明な項目は送信しない */
export type ChannelRegistration = {
  /** リンクか内部データに含まれるハンドル・大小文字を同一視する照合用の小文字表現 */
  handle?: string;
  /** リンクか内部データに含まれるチャンネル ID・大小文字を保持する */
  channel_id?: string;
  /** 画面に表示されたチャンネル名・取得できない場合は `undefined` */
  title?: string;
};

/**
 * 動画カードのチャンネルリンクまたは内部データから登録用の識別子と参考タイトルを取得する
 * 
 * ハンドルとチャンネル ID はリンクの URL またはカードの `browseEndpoint` から取得し、表示名から推測しない
 * 両方の取得元を調べ、同じ種類の識別子が食い違った場合は別チャンネルの混在を避けるため登録対象としない
 * 
 * @returns 登録用情報とボタンの配置先・識別子がない、曖昧、またはサムネイルがない場合は `null`
 */
export const getChannelRegistration = (cardElement: HTMLElement): { channel: ChannelRegistration; thumbnailElement: HTMLElement; } | null => {
  const thumbnailElement = getThumbnailElement(cardElement);
  if(thumbnailElement == null) return null;
  
  /** カード内のチャンネルリンクから見つかった識別子・同種の異なる値があれば `null` を返す */
  let handle: string | undefined;
  let channelId: string | undefined;
  let title: string | undefined;
  for(const linkElement of cardElement.querySelectorAll<HTMLAnchorElement>(youTubeSelectors.channelLinks)) {
    let url: URL;
    try { url = new URL(linkElement.href, location.href); }
    catch { continue; }
    if(url.hostname !== 'youtube.com' && !url.hostname.endsWith('.youtube.com')) continue;
    
    // チャンネル名のリンクが `/@handle/videos` などのタブを指す場合もある
    const handlePath = url.pathname.match((/^\/(%40|@)([^/]+)(?:\/(?:videos|shorts|streams|playlists|community|about|featured|live))?\/?$/i));
    if(handlePath != null) {
      let decodedHandle: string;
      try { decodedHandle = decodeURIComponent(handlePath[2]); }
      catch { continue; }
      if(!(/^([^\s/@?#:%]+)$/u).test(decodedHandle)) continue;
      
      const foundHandle = `@${decodedHandle.toLowerCase()}`;
      if(handle != null && handle !== foundHandle) return null;
      
      handle = foundHandle;
    }
    else {
      const foundChannelId = url.pathname.match((/^\/channel\/(UC[A-Za-z0-9_-]{22})(?:\/(?:videos|shorts|streams|playlists|community|about|featured|live))?\/?$/))?.[1];
      if(foundChannelId == null) continue;
      
      if(channelId != null && channelId !== foundChannelId) return null;
      
      channelId = foundChannelId;
    }
    
    // リンクの表示名を優先し、画像リンクのみならカード内のチャンネル名表示を使う
    const visibleName = linkElement.textContent.trim();
    if(title != null && visibleName !== '' && title !== visibleName) return null;
    if(title == null && visibleName !== '') title = visibleName;
  }
  
  // リンクが ID のみを示す場合も内部データのハンドルを調べ、矛盾がなければ同じカードの情報を合わせる
  const identifiers = getChannelIdentifiersFromData(cardElement);
  if((handle != null && identifiers?.handle != null && handle !== identifiers.handle) || (channelId != null && identifiers?.channel_id != null && channelId !== identifiers.channel_id)) return null;
  
  handle ??= identifiers?.handle;
  channelId ??= identifiers?.channel_id;
  if(handle == null && channelId == null) return null;
  
  title ??= cardElement.querySelector(youTubeSelectors.channelNames)?.textContent?.trim() || getLockupTitles(cardElement).channelTitle;
  
  return {
    channel: {
      ...(handle == null ? {} : { handle }),
      ...(channelId == null ? {} : { channel_id: channelId }),
      ...(title == null ? {} : { title })
    },
    thumbnailElement
  };
};
