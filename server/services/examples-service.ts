import type { Example } from '../../shared/types/entities/example';

/** Example : 複数テーブルにまたがる処理などは Service として切り出す */
export class ExamplesService {
  constructor(private readonly db: D1Database) { }
  
  /** Example : 何らかの処理をする例 */
  public async example(example: Partial<Example>): Promise<number> {
    const exampleStatement = this.db
      .prepare('INSERT INTO examples (name, memo, is_active) VALUES (?, ?, ?)')
      .bind(example.name, example.memo, example.is_active);
    const [result] = await this.db.batch([exampleStatement]);
    return result.meta.last_row_id;
  }
}
