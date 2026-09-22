import { booleanNumberFalse, booleanNumberTrue, booleanNumberValues, booleanStringFalse, booleanStringTrue } from '../constants/boolean-constants';
import { reduceNewlines } from '../helpers/reduce-newlines';

import type { BooleanNumber } from '../types/utilities/boolean-types';

/** 1行テキストを Trim する Preprocessor */
export const preprocessOneLineString    = (value: unknown): unknown => value == null ? '' : typeof value === 'string' ? value.trim()                 : value;
/** 複数行テキストを Trim・空行調整する Preprocessor */
export const preprocessMultiLinesString = (value: unknown): unknown => value == null ? '' : typeof value === 'string' ? reduceNewlines(value.trim()) : value;

/** Boolean に類する `value` をできるだけ Number に揃える Preprocessor */
export const preprocessBooleanNumber = (value: unknown): unknown => {
  if(typeof value === 'number') return booleanNumberValues.includes(value as BooleanNumber) ? value : value;
  if(typeof value === 'boolean') return value ? booleanNumberTrue : booleanNumberFalse;
  if(typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if([booleanStringTrue , 'true' ].includes(normalized)) return booleanNumberTrue;
    if([booleanStringFalse, 'false'].includes(normalized)) return booleanNumberFalse;
    return value;
  }
  return value;
};

/** エラーメッセージを組み立てる際、項目名の先頭・末尾が英数字だった場合のみスペースを入れる関数 */
const formatName = (text: string): string => text
  .replace((/^[A-Za-z0-9]/), ' $&')
  .replace((/[A-Za-z0-9]$/), '$& ');

/** エラーメッセージのテンプレート */
export const zodErrorMessages = {
  generalInvalid: (name: string): string => `${formatName(name)}を正しく入力してください`,
  invalidType   : (name: string): string => `${formatName(name)}に不正なデータが入力されています`,
  
  integer       : (name: string): string => `${formatName(name)}には整数を入力してください`,
  minimumNumber : (name: string, min: number): string => `${formatName(name)}は ${min} 以上で入力してください`,
  
  empty         : (name: string): string => `${formatName(name)}を入力してください`,
  
  booleanNumber : (name: string): string => `${formatName(name)}には真偽値として 0 か 1 を入力してください`
} as const;
