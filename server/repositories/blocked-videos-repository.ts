import { buildUpdateQuery } from '../helpers/build-update-query';

import type { CreateBlockedVideo, UpdateBlockedVideo, UpsertBlockedVideo } from '../../shared/schemas/blocked-video-schema';
import type { BlockedVideo } from '../../shared/types/entities/blocked-video';

/** `blocked_videos` テーブルを操作する */
export class BlockedVideosRepository {
  constructor(private readonly db: D1Database) { }
  
  /** 全件取得する */
  public async findAll(): Promise<Array<BlockedVideo>> {
    const result = await this.db.prepare('SELECT id, video_id, title, created_at FROM blocked_videos ORDER BY id ASC').all<BlockedVideo>();
    return result.results;
  }
  
  /** 1件取得する・存在しない場合は `null` を返す */
  public async findById(id: number): Promise<BlockedVideo | null> {
    return await this.db.prepare('SELECT id, video_id, title, created_at FROM blocked_videos WHERE id = ?').bind(id).first<BlockedVideo>();
  }
  
  /** 1件追加する・登録結果を `RETURNING` で取得し返す */
  public async create(blockedVideo: CreateBlockedVideo): Promise<BlockedVideo | null> {
    return await this.db
      .prepare('INSERT INTO blocked_videos (video_id, title) VALUES (?, ?) RETURNING id, video_id, title, created_at')
      .bind(blockedVideo.video_id, blockedVideo.title)
      .first<BlockedVideo>();
  }
  
  /**
   * 指定された項目だけを UPDATE し、更新結果を `RETURNING` で取得し返す
   * 
   * `undefined` の項目は保持し、`null` はクリアする・空の入力は Controller の Schema 検証で事前に拒否されている
   */
  public async update(id: number, blockedVideo: UpdateBlockedVideo): Promise<BlockedVideo | null> {
    const { sets, values } = buildUpdateQuery([
      { column: 'title', value: blockedVideo.title, shouldInclude: (value: unknown): boolean => value !== undefined }
    ]);
    return await this.db
      .prepare(`UPDATE blocked_videos SET ${sets.join(', ')} WHERE id = ? RETURNING id, video_id, title, created_at`)
      .bind(...values, id)
      .first<BlockedVideo>();
  }
  
  /**
   * 一意制約に一致しなければ INSERT、一致すれば UPDATE し、登録 or 更新できた結果を `RETURNING` で取得し返す
   * 
   * 省略項目は既存値を保持し、明示した `null` はクリアする・新規追加時の省略項目は `null` とする・`id` と `created_at` は更新しない
   */
  public async upsert(blockedVideo: UpsertBlockedVideo): Promise<BlockedVideo | null> {
    const { sets, values } = buildUpdateQuery([
      { column: 'video_id', value: blockedVideo.video_id, shouldInclude: (value: unknown): boolean => value !== undefined },
      { column: 'title'   , value: blockedVideo.title   , shouldInclude: (value: unknown): boolean => value !== undefined }
    ]);
    return await this.db
      .prepare(`INSERT INTO blocked_videos (video_id, title) VALUES (?, ?) ON CONFLICT(video_id) DO UPDATE SET ${sets.join(', ')} RETURNING id, video_id, title, created_at`)
      .bind(blockedVideo.video_id, blockedVideo.title ?? null, ...values)
      .first<BlockedVideo>();
  }
  
  /** 指定した ID を削除し、削除対象が存在したか否かを返す */
  public async delete(id: number): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM blocked_videos WHERE id = ?').bind(id).run();
    return result.meta.changes > 0;
  }
}
