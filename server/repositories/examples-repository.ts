import { buildUpdateQuery } from '../helpers/build-update-query';

import type { Example } from '../../shared/types/entities/example';

/** Example : `examples` テーブルの永続化操作を扱う Repository */
export class ExamplesRepository {
  constructor(private readonly db: D1Database) { }
  
  /** 一覧取得する */
  public async findAll(): Promise<Array<Example>> {
    const result = await this.db
      .prepare('SELECT id, name, memo, is_active FROM examples ORDER BY id ASC')
      .all<Example>();
    return result.results ?? [];
  }
  
  /** 指定した ID に一致する1件を取得する・存在しない場合は `null` を返す */
  public async findById(id: number): Promise<Example | null> {
    return await this.db
      .prepare(`SELECT id, name, memo, is_active FROM examples WHERE id = ? LIMIT 1`)
      .bind(id)
      .first<Example>();
  }
  
  /** 1件追加して採番 ID を返す */
  public async create(example: Partial<Example>): Promise<number> {
    const result = await this.db
      .prepare('INSERT INTO examples (name, memo, is_active) VALUES (?, ?, ?)')
      .bind(example.name, example.memo, example.is_active)
      .run();
    return result.meta.last_row_id;
  }
  
  /** 対象データの変更可能な項目だけを更新する */
  public async update(id: number, example: Partial<Example>): Promise<void> {
    // ID 以外の全項目を編集可能とする
    const { sets, values } = buildUpdateQuery([
      { column: 'name'      , value: example.name       },
      { column: 'memo'      , value: example.memo       },
      { column: 'is_active' , value: example.is_active  }
    ]);
    
    if(sets.length === 0) return;
    
    values.push(id);
    await this.db
      .prepare(`UPDATE examples SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
  }
  
  /** 指定した ID に一致する1件を削除し、削除成否を返す */
  public async delete(id: number): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM examples WHERE id = ?')
      .bind(id)
      .run();
    return result.meta.changes > 0;
  }
}
