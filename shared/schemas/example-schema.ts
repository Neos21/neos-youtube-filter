import z from 'zod';

import { preprocessBooleanNumber, preprocessMultiLinesString, preprocessOneLineString, zodErrorMessages } from './schema-utilities';
import { booleanNumberFalse, booleanNumberTrue } from '../constants/boolean-constants';
import { isEmpty } from '../helpers/is-empty';

// Example : 画面表示時に同じ文言を使用できるように `export` してある想定
export const idDisplayName        = 'ID'           as const;
export const nameDisplayName      = '必須入力項目' as const;
export const memoDisplayName      = '自由入力項目' as const;
export const isActiveDisplayName  = '状態'         as const;

/** Example 型の入力値を正規化し検証するスキーマ */
export const exampleSchema = z.object({
  id        : z.preprocess(
                value => isEmpty(value) ? 0 : value,  // 未入力時は 0 にして「1 以上とすること」というエラー扱いにする
                z.coerce.number({ error: zodErrorMessages.invalidType(idDisplayName) })
                  .int({ error: zodErrorMessages.integer(idDisplayName) })
                  .min(1, { error: zodErrorMessages.minimumNumber(idDisplayName, 1) })
              ),
  name      : z.preprocess(
                preprocessOneLineString,  // 単一行の入力値を整形する
                z.string({ error: zodErrorMessages.invalidType(nameDisplayName) })
                  .min(1, { error: zodErrorMessages.empty(nameDisplayName) })
              ),
  memo      : z.preprocess(
                preprocessMultiLinesString,  // 複数行の入力値を整形する
                z.string({ error: zodErrorMessages.invalidType(memoDisplayName) })
                  .nullish()  // `null`・`undefined` を許容する
              ),
  is_active : z.preprocess(
                preprocessBooleanNumber,  // Boolean な値を整形する
                z.union([z.literal(booleanNumberFalse), z.literal(booleanNumberTrue)], { error: zodErrorMessages.booleanNumber(isActiveDisplayName) })
              )
});
