import { getLockupData } from './get-lockup-data';

/** YouTube のカード内部データから取得したチャンネル識別子 */
export type ChannelIdentifiers = {
  /** チャンネル URL のハンドル・照合用に小文字化した値 */
  handle?: string;
  /** チャンネル URL の ID・大小文字を保持した値 */
  channel_id?: string;
};

/**
 * `yt-lockup-view-model` に対応する内部データからチャンネル遷移先の識別子を取得する
 * 
 * モバイルではカード自身の `data`、PC の関連動画では親の `data.contents` に `browseEndpoint` がある
 * 親に複数の動画がある場合はカードの動画 ID と同じ `contentId` のデータだけを使う
 * 複数の異なるチャンネルが含まれる場合は誤登録を避けるため `null` を返す
 * 
 * @param cardElement 対象の動画カード
 * @returns チャンネル ID またはハンドル・内部データがない、識別子がない、または曖昧な場合は `null`
 */
export const getChannelIdentifiersFromData = (cardElement: HTMLElement): ChannelIdentifiers | null => {
  const data = getLockupData(cardElement);
  if(data == null) return null;
  
  /** 探索済みオブジェクト・同じ参照を再訪せず循環参照にも対応する */
  const visited = new Set<object>();
  /** 見つかった識別子・異なる値を発見した場合は結果を破棄する */
  let channelId: string | undefined;
  let handle: string | undefined;
  let isAmbiguous = false;
  
  /** 内部データの各オブジェクトを辿り、チャンネルへの `browseEndpoint` を調べる */
  const visit = (value: unknown): void => {
    if(value == null || typeof value !== 'object' || visited.has(value)) return;
    visited.add(value);
    
    const object = value as Record<string, unknown>;
    const endpoint = object.browseEndpoint;
    if(endpoint != null && typeof endpoint === 'object') {
      const browseEndpoint = endpoint as Record<string, unknown>;
      const foundChannelId = browseEndpoint.browseId;
      if(typeof foundChannelId === 'string' && (/^UC[A-Za-z0-9_-]{22}$/).test(foundChannelId)) {
        if(channelId != null && channelId !== foundChannelId) isAmbiguous = true;
        channelId = foundChannelId;
      }
      
      const canonicalBaseUrl = browseEndpoint.canonicalBaseUrl;
      if(typeof canonicalBaseUrl === 'string') {
        const handlePath = canonicalBaseUrl.match((/^\/@([^/]+)\/?$/));
        if(handlePath != null) {
          let decodedHandle: string;
          try { decodedHandle = decodeURIComponent(handlePath[1]); }
          catch { decodedHandle = ''; }
          if((/^([^\s/@?#:%]+)$/u).test(decodedHandle)) {
            const foundHandle = `@${decodedHandle.toLowerCase()}`;
            if(handle != null && handle !== foundHandle) isAmbiguous = true;
            handle = foundHandle;
          }
        }
      }
    }
    
    for(const child of Object.values(object)) visit(child);
  };
  
  visit(data);
  if(isAmbiguous || (channelId == null && handle == null)) return null;
  
  return {
    ...(handle == null ? {} : { handle }),
    ...(channelId == null ? {} : { channel_id: channelId })
  };
};
