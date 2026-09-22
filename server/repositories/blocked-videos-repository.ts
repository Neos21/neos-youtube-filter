import { buildUpdateQuery } from '../helpers/build-update-query';

import type { CreateBlockedVideo, UpdateBlockedVideo } from '../../shared/schemas/blocked-video-schema';
import type { BlockedVideo } from '../../shared/types/entities/blocked-video';
import type { Result } from '../../shared/types/utilities/result';

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
  
  /**
   * 1件追加する : `video_id` の重複を検知したら何もしない
   * 
   * @returns 成功時は保存済の情報と、新規登録したか否かのフラグを返す
   *          DB 操作に失敗した場合や登録結果を取得できない場合はエラーを返す
   */
  public async create(blockedVideo: CreateBlockedVideo): Promise<Result<{ blockedVideo: BlockedVideo; isCreated: boolean; }>> {
    try {
      const results = await this.db.batch<BlockedVideo>([
        this.db.prepare('INSERT INTO blocked_videos (video_id, title) VALUES (?, ?) ON CONFLICT(video_id) DO NOTHING RETURNING id, video_id, title, created_at').bind(blockedVideo.video_id, blockedVideo.title),
        this.db.prepare('SELECT id, video_id, title, created_at FROM blocked_videos WHERE video_id = ?').bind(blockedVideo.video_id)
      ]);
      const savedBlockedVideo = results[1].results[0];
      if(savedBlockedVideo == null) return { error: '非表示動画の登録結果を取得できませんでした' };
      
      return { result: {
        blockedVideo: savedBlockedVideo,
        isCreated   : results[0].results.length > 0
      } };
    }
    catch {
      return { error: '非表示動画の登録に失敗しました' };
    }
  }
  
  /**
   * 1件更新する
   * 
   * 変更可能なのは `title` のみ・`null` が指定された場合は `NULL` への UPDATE 指定なので `SET` 句に含める
   * 
   * @returns 成功時は保存後のレコードを返す・ID が存在しなかった場合は `null` が返されるので呼び出し側でエラーレスポンスする
   */
  public async update(id: number, blockedVideo: UpdateBlockedVideo): Promise<Result<BlockedVideo | null>> {
    try {
      const { sets, values } = buildUpdateQuery([
        { column: 'title', value: blockedVideo.title, shouldInclude: (value: unknown): boolean => value !== undefined }
      ]);
      if(sets.length === 0) return { result: await this.findById(id) };
      
      const updatedBlockedVideo = await this.db
        .prepare(`UPDATE blocked_videos SET ${sets.join(', ')} WHERE id = ? RETURNING id, video_id, title, created_at`)
        .bind(...values, id)
        .first<BlockedVideo>();
      return { result: updatedBlockedVideo };
    }
    catch {
      return { error: '非表示動画の更新に失敗しました' };
    }
  }
  
  /** 指定した ID を削除し、削除対象が存在したか否かを返す */
  public async delete(id: number): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM blocked_videos WHERE id = ?').bind(id).run();
    return result.meta.changes > 0;
  }
}
