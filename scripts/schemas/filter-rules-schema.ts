import z from 'zod';

/** 判定用チャンネル情報の Schema・ハンドルとチャンネル ID を検証し、タイトルなどの追加項目は取り除く */
const channelSchema = z.object({
  handle: z.string().min(1).nullable(),
  channel_id: z.string().min(1).nullable()
});

/**
 * 文字列・正規表現の非表示パターンを表す Schema
 * 
 * 正規表現の構築は `createCardMatcher()` で行い、単純なスキーマ不正では失敗扱いにしない
 */
const patternSchema = z.object({
  type: z.enum(['string', 'regexp']),
  pattern: z.string().min(1),
  flags: z.string()
});

/**
 * メモリと LocalStorage で使う判定用条件の Schema・動画は ID の配列で保持する
 * 
 * `readFilterRules()` が保存値の形式確認に使う・定義していない項目は検証結果に含めない
 */
export const filterRulesSchema = z.object({
  blocked_videos: z.array(z.string().min(1)),
  blocked_channels: z.array(channelSchema),
  blocked_patterns: z.array(patternSchema),
  subscribed_channels: z.array(channelSchema)
});

/**
 * API の全件取得結果を判定用条件に変換する Schema
 * 
 * `blocked_videos` のレコード配列を動画 ID の配列にし、その他のレコードも必要項目だけに絞る
 * 起動側の `reload()` が応答 JSON の `result` に適用する
 */
export const apiFilterRulesSchema = filterRulesSchema.extend({
  blocked_videos: z.array(z.object({ video_id: z.string().min(1) })).transform(blockedVideos => blockedVideos.map(blockedVideo => blockedVideo.video_id))
});

/** メモリと LocalStorage で同じ形式を使う軽量なフィルター条件 */
export type FilterRules = z.infer<typeof filterRulesSchema>;
