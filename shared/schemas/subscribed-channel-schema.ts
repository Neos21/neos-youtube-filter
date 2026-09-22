import z from 'zod';

import { normalizeNullable, preprocessChannelId, preprocessHandle } from './schema-utilities';

/**
 * 購読チャンネルの各入力項目を整形し、個々の値の形式を検証する内部 Schema
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
 * 購読チャンネルの新規登録に使う Schema
 * 
 * `safeParse()` の成功結果には、整形済みの `handle`・`channel_id`・`title` が揃う
 * 省略した任意項目は `null` になり、`handle` と `channel_id` の両方が空ならエラーにする
 * URL の解析だけであり、チャンネルの実在確認や識別子同士の紐付け確認は行わない
 */
export const createSubscribedChannelSchema = channelFieldsSchema.refine(
  value => value.handle != null || value.channel_id != null,
  { message: 'ハンドルかチャンネル ID を入力してください', path: ['handle'] }
);

/**
 * 購読チャンネルの PATCH リクエストに含まれる項目だけを整形・検証する Schema
 * 
 * 省略した項目は変更しないという意味で、値を補完しない
 * 明示した `null` や空文字はその項目を消すという意味で、`null` として出力する
 * 両識別子を明示的に消す入力は拒否するが、片方だけの削除が可能か否かは DB の既存値によって異なる
 * 呼び出し側は成功時の `data` と取得済みレコードを `resolveSubscribedChannelUpdate()` に渡し、更新後の内容も検証する
 */
export const updateSubscribedChannelSchema = channelFieldsSchema.partial().refine(
  value => value.handle !== null || value.channel_id !== null,
  { message: 'ハンドルとチャンネル ID を両方削除できません', path: ['handle'] }
);

/** `createSubscribedChannelSchema` で検証・整形した後の登録用入力型 */
export type CreateSubscribedChannel = z.output<typeof createSubscribedChannelSchema>;

/**
 * `updateSubscribedChannelSchema` の検証成功後に使う変更項目の型
 * 
 * 各項目の `undefined` は変更なし、`null` は値の削除を表す
 */
export type UpdateSubscribedChannel = z.output<typeof updateSubscribedChannelSchema>;

/**
 * DB から取得した既存値に PATCH の変更項目を反映し、保存予定の内容を検証する
 * 
 * 例えば既存値が `{ handle : '@example', channel_id : null }` のとき `{ handle : null }` による更新は拒否する
 * 既存の `channel_id` が残る場合は同じ入力でも成功し、`handle` だけを削除できる
 * 
 * 呼び出し順は `updateSubscribedChannelSchema.safeParse()` → DB の既存レコード取得 → この関数とする
 * 呼び出し側が成功時の `data` を Repository に渡して保存する
 * 
 * @param current 保存済みレコードの `handle`・`channel_id`・`title`
 *                ID や登録日時を持つ Entity も渡せるが、この関数は変更可能な項目だけを取り出す
 * 
 * @param update `updateSubscribedChannelSchema.safeParse()` の成功時に得た `data`
 *               省略された項目は `current` の値を使用し、`null` が明示されていたら既存値を消す
 * 
 * @returns 成功時は `{ success : true, data }` として保存予定の項目を返す
 *          両識別子がなくなる場合などは `{ success : false, error }` を返すため、保存せず入力エラーとして扱う
 */
export const resolveSubscribedChannelUpdate = (current: CreateSubscribedChannel, update: UpdateSubscribedChannel): ReturnType<typeof createSubscribedChannelSchema.safeParse> => createSubscribedChannelSchema.safeParse({
  handle    : update.handle     === undefined ? current.handle     : update.handle,
  channel_id: update.channel_id === undefined ? current.channel_id : update.channel_id,
  title     : update.title      === undefined ? current.title      : update.title
});
