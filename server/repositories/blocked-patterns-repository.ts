import { buildUpdateQuery } from '../helpers/build-update-query';

import type { CreateBlockedPattern, UpdateBlockedPattern } from '../../shared/schemas/blocked-pattern-schema';
import type { BlockedPattern } from '../../shared/types/entities/blocked-pattern';

/** `blocked_patterns` テーブルを操作する */
export class BlockedPatternsRepository {
  constructor(private readonly db: D1Database) { }
  
  /** 全件取得する */
  public async findAll(): Promise<Array<BlockedPattern>> {
    const result = await this.db.prepare('SELECT id, type, pattern, flags, created_at FROM blocked_patterns ORDER BY id ASC').all<BlockedPattern>();
    return result.results;
  }
  
  /** 1件取得する・存在しない場合は `null` を返す */
  public async findById(id: number): Promise<BlockedPattern | null> {
    return await this.db.prepare('SELECT id, type, pattern, flags, created_at FROM blocked_patterns WHERE id = ?').bind(id).first<BlockedPattern>();
  }
  
  /** 1件追加する・登録結果を `RETURNING` で取得し返す */
  public async create(blockedPattern: CreateBlockedPattern): Promise<BlockedPattern | null> {
    return await this.db
      .prepare('INSERT INTO blocked_patterns (type, pattern, flags) VALUES (?, ?, ?) RETURNING id, type, pattern, flags, created_at')
      .bind(blockedPattern.type, blockedPattern.pattern, blockedPattern.flags)
      .first<BlockedPattern>();
  }
  
  /** 指定された項目を UPDATE し、更新結果を `RETURNING` で取得し返す */
  public async update(id: number, blockedPattern: UpdateBlockedPattern): Promise<BlockedPattern | null> {
    const { sets, values } = buildUpdateQuery([
      { column: 'type'   , value: blockedPattern.type    },
      { column: 'pattern', value: blockedPattern.pattern },
      { column: 'flags'  , value: blockedPattern.flags   }
    ]);
    return await this.db
      .prepare(`UPDATE blocked_patterns SET ${sets.join(', ')} WHERE id = ? RETURNING id, type, pattern, flags, created_at`)
      .bind(...values, id)
      .first<BlockedPattern>();
  }
  
  /** 指定した ID を削除し、削除対象が存在したか否かを返す */
  public async delete(id: number): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM blocked_patterns WHERE id = ?').bind(id).run();
    return result.meta.changes > 0;
  }
}
