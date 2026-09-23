import { describeError } from '../helpers/describe-error';

import type { FilterRules } from '../../shared/types/app/filter-rules';
import type { Result } from '../../shared/types/utilities/result';
import type { YouTubeCard } from '../types/youtube-card';
import type { Logger } from '../ui/create-logger';

/** ブラウザで構築できない正規表現も例外を外に出さず返す */
const createRegExp = (pattern: string, flags: string): Result<RegExp> => {
  try {
    return { result: new RegExp(pattern, flags) };
  }
  catch(error) {
    return { error: describeError(error) };
  }
};

/**
 * 条件更新時に識別子の集合と正規表現を作り、カードごとに一致理由を返す判定関数を生成する
 * 
 * 一致しない場合は `null`・不正な正規表現はログに通知してその条件だけを除外する
 */
export const createCardMatcher = (filterRules: FilterRules, logger: Logger): (card: YouTubeCard) => string | null => {
  const videoIds = new Set(filterRules.blocked_videos.map(video => video.video_id));
  const channels = [...filterRules.blocked_channels, ...filterRules.subscribed_channels];
  const handles = new Set(channels.flatMap(channel => channel.handle == null ? [] : [channel.handle.toLowerCase()]));
  const channelIds = new Set(channels.flatMap(channel => channel.channel_id == null ? [] : [channel.channel_id]));
  const patterns: Array<{ id: number; matches: (text: string) => boolean; }> = [];
  for(const pattern of filterRules.blocked_patterns) {
    if(pattern.type === 'string') {
      const keyword = pattern.pattern.toLowerCase();
      patterns.push({ id: pattern.id, matches: (text: string): boolean => text.toLowerCase().includes(keyword) });
      continue;
    }
    const compiled = createRegExp(pattern.pattern, pattern.flags);
    if(compiled.error != null) {
      logger.error(`正規表現をスキップ (パターン ID ${pattern.id}) : ${compiled.error}`);
      continue;
    }
    const regularExpression = compiled.result;
    patterns.push({
      id: pattern.id,
      matches: (text: string): boolean => {
        // `g`・`y` フラグでも前の文字列の評価位置を引き継がない
        regularExpression.lastIndex = 0;
        return regularExpression.test(text);
      }
    });
  }
  return (card: YouTubeCard): string | null => {
    if(videoIds.has(card.videoId)) return '動画 ID';
    if(card.handle != null && handles.has(card.handle.toLowerCase())) return 'チャンネルハンドル';
    if(card.channelId != null && channelIds.has(card.channelId)) return 'チャンネル ID';
    for(const pattern of patterns) {
      if((card.title != null && pattern.matches(card.title)) || (card.channelName != null && pattern.matches(card.channelName))) return `パターン ID ${pattern.id}`;
    }
    return null;
  };
};
