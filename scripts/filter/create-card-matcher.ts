import { describeError } from '../helpers/describe-error';

import type { FilterRules } from '../schemas/filter-rules-schema';
import type { Logger } from '../ui/create-menu';

/**
 * フィルター条件に基づいて、1枚のカードを非表示にするか判定する関数を作る
 * 
 * チャンネルの一覧と正規表現を先に準備し、返した関数から各カードの HTML・表示文字列と照合する
 * `createPageFilter()` が条件更新時に呼び、返された関数をカードの再判定に使う
 * この関数も返された関数も、元のカードの DOM や表示状態は変更しない
 * 
 * @returns カード要素を受け取り、一致した理由を返す関数・理由の文字列があれば呼び出し側で隠し、`null` なら隠さない
 */
export const createCardMatcher = (filterRules: FilterRules, logger: Logger): (element: HTMLElement) => string | null => {
  /** 非表示判定に使うチャンネル一覧・購読チャンネルも同じ非表示条件として合わせる */
  const channels = [...filterRules.blocked_channels, ...filterRules.subscribed_channels];
  /** 取得済みのチャンネル ID 一覧・識別子の大文字小文字は保持する */
  const channelIds = channels.flatMap(channel => channel.channel_id == null ? [] : [channel.channel_id]);
  /** 取得済みのハンドル一覧・大文字小文字を区別せず照合するため小文字化する */
  const handles = channels.flatMap(channel => channel.handle == null ? [] : [channel.handle.toLowerCase()]);
  
  /** 照合用に準備したパターン・`label` はログに出す理由、`value` は小文字のキーワードまたは正規表現 */
  const patterns: Array<{ label: string; value: string | RegExp; }> = [];
  filterRules.blocked_patterns.forEach((pattern, index) => {
    try {
      patterns.push({
        label: `パターン ${index + 1}`,
        value: pattern.type === 'string' ? pattern.pattern.toLowerCase() : new RegExp(pattern.pattern, pattern.flags)
      });
    }
    catch(error) {
      logger.error(`パターン ${index + 1} をスキップ : ${describeError(error)}`);
    }
  });
  
  /**
   * 1枚のカードに一致する非表示条件を調べ、最初に一致した理由を返す
   * 
   * 例えば動画 ID が一致すれば `動画 …`、パターンなら `パターン 1` などを返す
   * 呼び出し側の `processCards()` は、この文字列を非表示の判断とログに使う
   * 一致しない場合の `null` は、表示を維持するか、以前の非表示を解除する判断に使う
   */
  return (element: HTMLElement): string | null => {
    /** 照合対象の DOM・通常は元のカード、独自 UI がある場合はそれを除いた複製 */
    let content = element;
    // 自分のボタンの文言で一致しないよう、UI がある場合だけ複製して取り除く・実際のページには触れない
    if(element.querySelector('[data-ytf-ui]') != null) {
      content = element.cloneNode(true) as HTMLElement;
      content.querySelectorAll('[data-ytf-ui]').forEach(node => node.remove());
    }
    
    /** 識別子を探す HTML 文字列・リンク URL や属性に含まれる ID・ハンドルも調べる */
    const html = content.innerHTML;
    /** パターンを照合する表示文字列・タイトル以外に説明文や視聴回数なども含む */
    const text = content.textContent ?? '';
    
    // 動画 ID で判定する
    const videoId = filterRules.blocked_videos.find(value => html.includes(value));
    if(videoId != null) return `動画 ${videoId}`;
    
    // チャンネル ID で判定する
    const channelId = channelIds.find(value => html.includes(value));
    if(channelId != null) return `チャンネル ${channelId}`;
    
    // チャンネルのハンドルで判定する
    const lowerHtml = html.toLowerCase();
    // 日本語などのハンドルは、URL エンコードされてリンクに現れる場合もある
    const handle = handles.find(value => lowerHtml.includes(value) || lowerHtml.includes(encodeURI(value).toLowerCase()));
    if(handle != null) return `ハンドル ${handle}`;
    
    // 文字列か正規表現で判定する
    const lowerText = text.toLowerCase();
    for(const pattern of patterns) {
      if(typeof pattern.value === 'string') {
        // 文字列でのチェック
        if(lowerText.includes(pattern.value)) return pattern.label;
      }
      else {
        // 正規表現でのチェック : `g`・`y` の評価位置をカード間で引き継がない
        pattern.value.lastIndex = 0;
        if(pattern.value.test(text)) return pattern.label;
      }
    }
    
    // いずれにも合致しなかった要素
    return null;
  };
};
