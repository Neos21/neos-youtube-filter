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

/**
 * 非表示パターンの登録内容を整形し、正規表現として使用可能か否かを検証する Schema
 * 
 * 正規表現は `flags` の省略時だけ `iu` を補い、明示的な空文字はフラグなしとして保持する
 * 文字列型の `flags` は空文字に揃え、正規表現型では `new RegExp(pattern, flags)` の構築可否を確認する
 * `safeParse()` の成功時の `data` を登録に使用する
 */
export const createBlockedPatternSchema = patternFieldsSchema.extend({ flags: z.string().optional() })
  .transform(value => ({
    ...value,
    flags: value.type === 'string' ? '' : value.flags ?? 'iu'
  }))
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
 * 非表示パターンの PATCH リクエストに含まれる変更項目だけを検証する Schema
 * 
 * 例えば `{ flags : 'i' }` を受け付け、未指定の `type` と `pattern` はこの段階では補わない
 * そのため、この Schema の成功だけでは更新後の正規表現が有効であることを保証しない
 * 呼び出し側は成功時の `data` と DB の既存レコードを `resolveBlockedPatternUpdate()` に渡して再検証する
 * `null` は全項目で拒否し、`flags` の空文字はフラグなしとして許容する
 */
export const updateBlockedPatternSchema = patternFieldsSchema.partial();

/**
 * 登録 Schema の検証・整形後の入力型
 * 
 * `flags` は省略不可となり、既定値・明示値・文字列型の空文字のいずれかに確定している
 */
export type CreateBlockedPattern = z.output<typeof createBlockedPatternSchema>;

/**
 * 更新 Schema の検証後の変更項目の型
 * 
 * `undefined` は変更なし、`flags` の空文字はフラグをすべて外す指定を表す
 */
export type UpdateBlockedPattern = z.output<typeof updateBlockedPatternSchema>;

/**
 * 既存パターンに PATCH の変更項目を反映し、保存予定の種別・パターン・フラグを検証する
 * 
 * 例えば `{ flags : 'i' }` の更新では既存の `type` と `pattern` を使用して正規表現を構築できるか確認する
 * 文字列型から正規表現型への切替では、フラグ未指定なら `iu` を補い、明示的な空文字ならフラグなしにする
 * 正規表現型から文字列型への切替ではフラグを空文字にする
 * 
 * 呼び出し順は `updateBlockedPatternSchema.safeParse()` → DB の既存レコード取得 → この関数とする
 * 呼び出し側が成功時の `data` を Repository に渡して保存する
 * 
 * @param current DB から取得した既存レコードの `type`・`pattern`・`flags`
 *                ID や登録日時を持つ Entity も渡せるが、この関数は変更可能な項目だけを取り出す
 * 
 * @param update `updateBlockedPatternSchema.safeParse()` の成功時に得た `data`
 *               未指定項目は既存値を引き継ぐが、種別を変更した場合のフラグは上述の切替規則に従う
 * 
 * @returns 成功時は `{ success : true, data }` として保存予定の項目を返す
 *          更新後の正規表現やフラグが不正なら `{ success : false, error }` を返すため、保存せず入力エラーとして扱う
 */
export const resolveBlockedPatternUpdate = (current: CreateBlockedPattern, update: UpdateBlockedPattern): ReturnType<typeof createBlockedPatternSchema.safeParse> => createBlockedPatternSchema.safeParse({
  type   : update.type    ?? current.type,
  pattern: update.pattern ?? current.pattern,
  flags  : update.flags !== undefined ? update.flags : current.type === 'string' && update.type === 'regexp' ? 'iu' : current.flags
});
