import type { BooleanNumber, BooleanString } from '../types/utilities/boolean-types';

/** SQLite には Boolean 型がないため、0 = False・1 = True で表現する箇所が多数ある・そのための定義 (マジックナンバー) */
export const booleanNumberValues = [ 0 ,  1 ] as const;
/** 主にフロントエンドのフォームにおいて Boolean 相当の 0・1 を文字列で扱う場面があるため定義 (型定義のためココだけマジックナンバー) */
export const booleanStringValues = ['0', '1'] as const;

/** 0 = False */
export const booleanNumberFalse: BooleanNumber = booleanNumberValues[0];
/** 1 = True */
export const booleanNumberTrue : BooleanNumber = booleanNumberValues[1];

/** '0' = False */
export const booleanStringFalse: BooleanString = booleanStringValues[0];
/** '1' = True */
export const booleanStringTrue : BooleanString = booleanStringValues[1];
