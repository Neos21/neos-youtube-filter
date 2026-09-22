import z from 'zod';

import { normalizeNullable, preprocessVideoId } from './schema-utilities';

/**
 * 非表示動画の新規登録に使う Schema
 * 
 * `video_id` は動画 ID または対応する YouTube URL を受け取り、保存用の動画 ID に整形する
 * `title` は前後の空白を除去し、省略・`null`・空文字は `null` とする
 * `safeParse()` の成功時の `data` を登録に使用し、`id`・`created_at`・その他未定義の項目は受け付けない
 */
export const createBlockedVideoSchema = z.strictObject({
  video_id: z.preprocess(
              preprocessVideoId,
              z.string().regex((/^[A-Za-z0-9_-]{11}$/), '動画 ID を正しく入力してください')
            ),
  title   : z.preprocess(
              value => normalizeNullable(typeof value === 'string' ? value.trim() : value),
              z.string().nullable()
            )
});

/**
 * 非表示動画の PATCH リクエストでタイトルだけを整形・検証する Schema
 * 
 * 例えば `{ title : null }` はタイトルだけを消す指定で、`video_id` は変更しない
 * 省略項目は出力にも補完せず、呼び出し側は `undefined` の項目を更新対象から除外する
 * 登録後の `video_id` は変更不可とし、同じ値であっても入力を拒否する
 * `id`・`created_at`・その他未定義の項目も受け付けない
 * 空の PATCH は更新する項目がないため拒否する
 */
export const updateBlockedVideoSchema = createBlockedVideoSchema.pick({ title: true }).partial().refine(
  value => value.title !== undefined,
  { message: '更新する項目を指定してください' }
);

/**
 * 登録 Schema の検証・整形後の入力型
 * 
 * `video_id` は抽出済みの動画 ID、`title` は前後の空白を除いた文字列または `null` となる
 */
export type CreateBlockedVideo = z.output<typeof createBlockedVideoSchema>;

/**
 * 更新 Schema の検証後の変更項目の型
 * 
 * `undefined` は変更なし、`title` の `null` はタイトルの削除を表す
 */
export type UpdateBlockedVideo = z.output<typeof updateBlockedVideoSchema>;

/**
 * 動画 ID を照合キーとして追加または更新する PUT 用の Schema
 * 
 * `video_id` は必須で、既存レコードの動画 ID を別の値に変更する用途には使用しない
 * `title` の省略は既存値を保持し、`null` または空文字が指定されたらクリアする
 * 新規追加時に `title` を省略した場合は `null` を保存する
 */
export const upsertBlockedVideoSchema = createBlockedVideoSchema.extend({
  title: createBlockedVideoSchema.shape.title.optional()
});

/** PUT の検証後の入力型・`video_id` は照合キー、`title` の `undefined` は既存値の保持を表す */
export type UpsertBlockedVideo = z.output<typeof upsertBlockedVideoSchema>;
