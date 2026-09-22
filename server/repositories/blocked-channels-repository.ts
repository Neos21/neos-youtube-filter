import { buildUpdateQuery } from '../helpers/build-update-query';

import type { CreateBlockedChannel, UpdateBlockedChannel, UpsertBlockedChannel } from '../../shared/schemas/blocked-channel-schema';
import type { BlockedChannel } from '../../shared/types/entities/blocked-channel';

/** `blocked_channels` テーブルを操作する */
export class BlockedChannelsRepository {
  constructor(private readonly db: D1Database) { }
  
  /** 全件取得する */
  public async findAll(): Promise<Array<BlockedChannel>> {
    const result = await this.db.prepare('SELECT id, handle, channel_id, title, created_at FROM blocked_channels ORDER BY id ASC').all<BlockedChannel>();
    return result.results;
  }
  
  /** 1件取得する・存在しない場合は `null` を返す */
  public async findById(id: number): Promise<BlockedChannel | null> {
    return await this.db.prepare('SELECT id, handle, channel_id, title, created_at FROM blocked_channels WHERE id = ?').bind(id).first<BlockedChannel>();
  }
  
  /** 1件追加する・登録結果を `RETURNING` で取得し返す */
  public async create(blockedChannel: CreateBlockedChannel): Promise<BlockedChannel | null> {
    return await this.db
      .prepare('INSERT INTO blocked_channels (handle, channel_id, title) VALUES (?, ?, ?) RETURNING id, handle, channel_id, title, created_at')
      .bind(blockedChannel.handle, blockedChannel.channel_id, blockedChannel.title)
      .first<BlockedChannel>();
  }
  
  /**
   * 指定された項目だけを UPDATE し、更新結果を `RETURNING` で取得し返す
   * 
   * `undefined` の項目は保持し、`null` はクリアする・空の入力は Controller の Schema 検証で事前に拒否されている
   */
  public async update(id: number, blockedChannel: UpdateBlockedChannel): Promise<BlockedChannel | null> {
    const { sets, values } = buildUpdateQuery([
      { column: 'handle'    , value: blockedChannel.handle    , shouldInclude: (value: unknown): boolean => value !== undefined },
      { column: 'channel_id', value: blockedChannel.channel_id, shouldInclude: (value: unknown): boolean => value !== undefined },
      { column: 'title'     , value: blockedChannel.title     , shouldInclude: (value: unknown): boolean => value !== undefined }
    ]);
    return await this.db
      .prepare(`UPDATE blocked_channels SET ${sets.join(', ')} WHERE id = ? RETURNING id, handle, channel_id, title, created_at`)
      .bind(...values, id)
      .first<BlockedChannel>();
  }
  
  /**
   * 一意制約に一致しなければ INSERT、一致すれば UPDATE し、登録 or 更新できた結果を `RETURNING` で取得し返す
   * 
   * 省略項目は既存値を保持し、明示した `null` はクリアする・新規追加時の省略項目は `null` とする・`id` と `created_at` は更新しない
   */
  public async upsert(blockedChannel: UpsertBlockedChannel): Promise<BlockedChannel | null> {
    const { sets, values } = buildUpdateQuery([
      { column: 'handle'    , value: blockedChannel.handle    , shouldInclude: (value: unknown): boolean => value !== undefined },
      { column: 'channel_id', value: blockedChannel.channel_id, shouldInclude: (value: unknown): boolean => value !== undefined },
      { column: 'title'     , value: blockedChannel.title     , shouldInclude: (value: unknown): boolean => value !== undefined }
    ]);
    return await this.db
      .prepare(`INSERT INTO blocked_channels (handle, channel_id, title) VALUES (?, ?, ?) ON CONFLICT DO UPDATE SET ${sets.join(', ')} RETURNING id, handle, channel_id, title, created_at`)
      .bind(blockedChannel.handle ?? null, blockedChannel.channel_id ?? null, blockedChannel.title ?? null, ...values)
      .first<BlockedChannel>();
  }
  
  /** 指定した ID を削除し、削除対象が存在したか否かを返す */
  public async delete(id: number): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM blocked_channels WHERE id = ?').bind(id).run();
    return result.meta.changes > 0;
  }
}
