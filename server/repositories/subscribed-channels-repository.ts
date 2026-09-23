import { buildUpdateQuery } from '../helpers/build-update-query';

import type { CreateSubscribedChannel, UpdateSubscribedChannel, UpsertSubscribedChannel } from '../../shared/schemas/subscribed-channel-schema';
import type { SubscribedChannel } from '../../shared/types/entities/subscribed-channel';

/** `subscribed_channels` テーブルを操作する */
export class SubscribedChannelsRepository {
  constructor(private readonly db: D1Database) { }
  
  /** 全件取得する */
  public async findAll(): Promise<Array<SubscribedChannel>> {
    const result = await this.db.prepare('SELECT id, handle, channel_id, title, created_at FROM subscribed_channels ORDER BY id ASC').all<SubscribedChannel>();
    return result.results;
  }
  
  /** 1件取得する・存在しない場合は `null` を返す */
  public async findById(id: number): Promise<SubscribedChannel | null> {
    return await this.db.prepare('SELECT id, handle, channel_id, title, created_at FROM subscribed_channels WHERE id = ? LIMIT 1').bind(id).first<SubscribedChannel>();
  }
  
  /** 指定されたハンドルまたはチャンネル ID に一致するレコードを探す・両方が別レコードに一致した場合も返す */
  public async findByIdentifiers(handle: string | null, channelId: string | null): Promise<Array<SubscribedChannel>> {
    const result = await this.db
      .prepare('SELECT id, handle, channel_id, title, created_at FROM subscribed_channels WHERE handle = ? OR channel_id = ? LIMIT 2')
      .bind(handle, channelId)
      .all<SubscribedChannel>();
    return result.results;
  }
  
  /** 参考タイトルが完全一致するレコードを探す・複数一致を判定できるよう最大2件返す */
  public async findByTitle(title: string): Promise<Array<SubscribedChannel>> {
    const result = await this.db
      .prepare('SELECT id, handle, channel_id, title, created_at FROM subscribed_channels WHERE title = ? LIMIT 2')
      .bind(title)
      .all<SubscribedChannel>();
    return result.results;
  }
  
  /** 1件追加する・登録結果を `RETURNING` で取得し返す */
  public async create(subscribedChannel: CreateSubscribedChannel): Promise<SubscribedChannel | null> {
    return await this.db
      .prepare('INSERT INTO subscribed_channels (handle, channel_id, title) VALUES (?, ?, ?) RETURNING id, handle, channel_id, title, created_at')
      .bind(subscribedChannel.handle, subscribedChannel.channel_id, subscribedChannel.title)
      .first<SubscribedChannel>();
  }
  
  /**
   * 指定された項目だけを UPDATE し、更新結果を `RETURNING` で取得し返す
   * 
   * `undefined` の項目は保持し、`null` はクリアする・空の入力は Controller の Schema 検証で事前に拒否されている
   */
  public async update(id: number, subscribedChannel: UpdateSubscribedChannel): Promise<SubscribedChannel | null> {
    const { sets, values } = buildUpdateQuery([
      { column: 'handle'    , value: subscribedChannel.handle    , shouldInclude: (value: unknown): boolean => value !== undefined },
      { column: 'channel_id', value: subscribedChannel.channel_id, shouldInclude: (value: unknown): boolean => value !== undefined },
      { column: 'title'     , value: subscribedChannel.title     , shouldInclude: (value: unknown): boolean => value !== undefined }
    ]);
    return await this.db
      .prepare(`UPDATE subscribed_channels SET ${sets.join(', ')} WHERE id = ? RETURNING id, handle, channel_id, title, created_at`)
      .bind(...values, id)
      .first<SubscribedChannel>();
  }
  
  /**
   * 一意制約に一致しなければ INSERT、一致すれば UPDATE し、登録 or 更新できた結果を `RETURNING` で取得し返す
   * 
   * 省略項目は既存値を保持し、明示した `null` はクリアする・新規追加時の省略項目は `null` とする・`id` と `created_at` は更新しない
   */
  public async upsert(subscribedChannel: UpsertSubscribedChannel): Promise<SubscribedChannel | null> {
    const { sets, values } = buildUpdateQuery([
      { column: 'handle'    , value: subscribedChannel.handle    , shouldInclude: (value: unknown): boolean => value !== undefined },
      { column: 'channel_id', value: subscribedChannel.channel_id, shouldInclude: (value: unknown): boolean => value !== undefined },
      { column: 'title'     , value: subscribedChannel.title     , shouldInclude: (value: unknown): boolean => value !== undefined }
    ]);
    return await this.db
      .prepare(`INSERT INTO subscribed_channels (handle, channel_id, title) VALUES (?, ?, ?) ON CONFLICT DO UPDATE SET ${sets.join(', ')} RETURNING id, handle, channel_id, title, created_at`)
      .bind(subscribedChannel.handle ?? null, subscribedChannel.channel_id ?? null, subscribedChannel.title ?? null, ...values)
      .first<SubscribedChannel>();
  }
  
  /** 指定した ID を削除し、削除対象が存在したか否かを返す */
  public async delete(id: number): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM subscribed_channels WHERE id = ?').bind(id).run();
    return result.meta.changes > 0;
  }
}
