import z from 'zod';

/** 保存済み動画の応答形式・入力用 Schema と異なり保存値を変換しない */
const blockedVideoSchema = z.object({
  id: z.number().int().positive(),
  video_id: z.string().min(1),
  title: z.string().nullable(),
  created_at: z.string().min(1)
});

/** 非表示・購読チャンネルに共通する応答形式・少なくとも一方の識別子を必要とする */
const channelSchema = z.object({
  id: z.number().int().positive(),
  handle: z.string().min(1).nullable(),
  channel_id: z.string().min(1).nullable(),
  title: z.string().nullable(),
  created_at: z.string().min(1)
}).refine(value => value.handle != null || value.channel_id != null);

/** 保存済みパターンの応答形式・実行環境での正規表現構築は照合処理で個別に検証する */
const blockedPatternSchema = z.object({
  id: z.number().int().positive(),
  type: z.enum(['string', 'regexp']),
  pattern: z.string().min(1),
  flags: z.string(),
  created_at: z.string().min(1)
}).refine(value => value.type === 'regexp' || value.flags === '');

/** API・キャッシュの4種類の条件を検証する・欠落した配列を空配列で補わない */
export const filterRulesSchema = z.object({
  blocked_videos: z.array(blockedVideoSchema),
  blocked_channels: z.array(channelSchema),
  blocked_patterns: z.array(blockedPatternSchema),
  subscribed_channels: z.array(channelSchema)
});

/** キャッシュの版・取得日時・取得元・条件を検証する・未対応の版は拒否する */
export const filterRulesCacheSchema = z.object({
  version: z.literal(1),
  fetchedAt: z.iso.datetime(),
  apiUrl: z.string(),
  rules: filterRulesSchema
});
