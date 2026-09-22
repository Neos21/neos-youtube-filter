import z from 'zod';

import { normalizeNullable, preprocessChannelId, preprocessHandle } from './schema-utilities';

/**
 * 非表示チャンネルの各入力項目を整形し、個々の値の形式を検証する内部 Schema
 * 
 * URL から識別子を抽出し、空の識別子・タイトルを `null` に変換する
 * この段階では両識別子が `null` でも許容し、登録・更新それぞれの Schema で必須条件を追加する
 * `id`・`created_at` を含む未定義の項目は拒否する
 */
const channelFieldsSchema = z.strictObject({
  handle    : z.preprocess(
                preprocessHandle,
                z.string().regex((/^@[^\s/@?#:%]+$/u), 'ハンドルを正しく入力してください').nullable()
              ),
  channel_id: z.preprocess(
                preprocessChannelId,
                z.string().regex((/^UC[A-Za-z0-9_-]{22}$/), 'チャンネル ID を正しく入力してください').nullable()
              ),
  title     : z.preprocess(
                value => normalizeNullable(typeof value === 'string' ? value.trim() : value),
                z.string().nullable()
              )
});

/**
 * 非表示チャンネルの新規登録に使う Schema
 * 
 * `safeParse()` の成功結果には、整形済みの `handle`・`channel_id`・`title` が揃う
 * 省略した任意項目は `null` になり、`handle` と `channel_id` の両方が空ならエラーにする
 * URL の解析だけであり、チャンネルの実在確認や識別子同士の紐付け確認は行わない
 */
export const createBlockedChannelSchema = channelFieldsSchema.refine(
  value => value.handle != null || value.channel_id != null,
  { message: 'ハンドルかチャンネル ID を入力してください', path: ['handle'] }
);

/**
 * 非表示チャンネルの PATCH リクエストに含まれる項目だけを整形・検証する Schema
 * 
 * 省略した項目は変更しないという意味で、値を補完しない
 * 明示した `null` や空文字はその項目を消すという意味で、`null` として出力する
 * 空の PATCH は更新する項目がないため拒否する
 * 更新後に両識別子がなくなる場合は DB の `CHECK` 制約で拒否される
 */
export const updateBlockedChannelSchema = channelFieldsSchema.partial().refine(
  value => value.handle !== undefined || value.channel_id !== undefined || value.title !== undefined,
  { message: '更新する項目を指定してください' }
);

/** `createBlockedChannelSchema` で検証・整形した後の登録用入力型 */
export type CreateBlockedChannel = z.output<typeof createBlockedChannelSchema>;

/**
 * `updateBlockedChannelSchema` の検証成功後に使う変更項目の型
 * 
 * 各項目の `undefined` は変更なし、`null` は値の削除を表す
 */
export type UpdateBlockedChannel = z.output<typeof updateBlockedChannelSchema>;

/**
 * ハンドルまたはチャンネル ID を照合キーとして追加または更新する PUT 用の Schema
 * 
 * 少なくとも一方の識別子を指定し、省略した項目は既存値を保持する
 * `null` または空文字を指定した項目はクリアし、新規追加時の省略項目は `null` を保存する
 * 両識別子が別レコードを指す場合などの競合は DB の一意制約で拒否する
 */
export const upsertBlockedChannelSchema = channelFieldsSchema.partial().refine(
  value => value.handle != null || value.channel_id != null,
  { message: 'ハンドルかチャンネル ID を入力してください', path: ['handle'] }
);

/** PUT の検証後の入力型・`undefined` は既存値の保持、`null` はクリアを表す */
export type UpsertBlockedChannel = z.output<typeof upsertBlockedChannelSchema>;
