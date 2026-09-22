import type { BlockedChannel } from '../entities/blocked-channel';
import type { BlockedPattern } from '../entities/blocked-pattern';
import type { BlockedVideo } from '../entities/blocked-video';
import type { SubscribedChannel } from '../entities/subscribed-channel';

/** GET `/api/filter-rules` の結果オブジェクト・取得失敗はこの型の空配列で代用しない */
export type FilterRules = {
  blocked_videos: Array<BlockedVideo>;
  blocked_channels: Array<BlockedChannel>;
  blocked_patterns: Array<BlockedPattern>;
  subscribed_channels: Array<SubscribedChannel>;
};
