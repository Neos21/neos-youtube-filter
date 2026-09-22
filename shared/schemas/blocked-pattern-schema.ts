import z from 'zod';

/**
 * 非表示パターンの項目の型と必須条件を定義する内部 Schema
 * 
 * `pattern` は空文字を拒否するが、空白文字自体が検索条件になる場合もあるため Trim しない
 * この段階では正規表現を構築せず、`type` と `pattern` と `flags` が揃った登録用 Schema で構文を検証する
 * `id`・`created_at` を含む未定義の項目は拒否する
 */
const patternFieldsSchema = z.strictObject({
  type   : z.enum(['string', 'regexp']),
  pattern: z.string().min(1, 'パターンを入力してください'),  // 空白文字も正規表現や部分一致の意味を持つため Trim はしない
  flags  : z.string()
});

/** 全項目が揃ったパターンのフラグを整形し、正規表現の構文を検証する内部 Schema */
const validatedPatternSchema = patternFieldsSchema
  .transform(value => ({ ...value, flags: value.type === 'string' ? '' : value.flags }))
  .superRefine((value, context): void => {
    if(value.type === 'string') return;
    
    try {
      new RegExp(value.pattern, value.flags);
    }
    catch {
      context.addIssue({ code: 'custom', message: '正規表現またはフラグが不正です', path: ['pattern'] });
    }
  });

/**
 * 非表示パターンの登録内容を整形し、正規表現として使用可能か否かを検証する Schema
 * 
 * 正規表現は `flags` の省略時だけ `iu` を補い、明示的な空文字はフラグなしとして保持する
 * 文字列型の `flags` は空文字に揃え、正規表現型では `new RegExp(pattern, flags)` の構築可否を確認する
 * `safeParse()` の成功時の `data` を登録に使用する
 */
export const createBlockedPatternSchema = patternFieldsSchema.extend({ flags: z.string().optional() })
  .transform(value => ({ ...value, flags: value.flags ?? 'iu' }))
  .pipe(validatedPatternSchema);

/**
 * 非表示パターンの PATCH リクエストを検証する Schema
 * 
 * `type`・`pattern`・`flags` の3項目を必須とし、DB の既存値を取得せずに更新後の組み合わせを検証する
 * 例えばフラグだけを変更する場合も `{ type : 'regexp', pattern : '^example', flags : 'i' }` のように全項目を送る
 * `flags` の空文字はフラグなしの指定として保持し、文字列型の場合は空文字に揃える
 * `null`・項目の省略・未知の項目を拒否し、成功時の `data` をそのまま UPDATE に使用する
 */
export const updateBlockedPatternSchema = validatedPatternSchema;

/**
 * 登録 Schema の検証・整形後の入力型
 * 
 * `flags` は省略不可となり、既定値・明示値・文字列型の空文字のいずれかに確定している
 */
export type CreateBlockedPattern = z.output<typeof createBlockedPatternSchema>;

/**
 * 更新 Schema の検証・整形後の入力型
 * 
 * `type`・`pattern`・`flags` はすべて確定済みで、既存値との統合は不要
 * 正規表現型の `flags` の空文字はフラグなし、文字列型の空文字はフラグ未使用を表す
 */
export type UpdateBlockedPattern = z.output<typeof updateBlockedPatternSchema>;
