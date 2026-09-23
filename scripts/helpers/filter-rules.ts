import { describeError } from './describe-error';
import { readStorage, writeStorage } from './storage';
import { filterRulesStorageKey } from '../constants';
import { filterRulesSchema } from '../schemas/filter-rules-schema';

import type { FilterRules } from '../schemas/filter-rules-schema';
import type { Logger } from '../ui/create-menu';

/**
 * LocalStorage に保存したフィルター条件を読み出し、判定用のオブジェクトとして返す
 * 
 * JSON の読込と Schema による形式確認だけを行い、API 通信やカードの非表示は行わない
 * 起動側では戻り値があればその条件を使い、`null` なら API から初回取得する
 * 
 * @returns 利用できる保存済み条件・未保存、旧形式、破損、LocalStorage 利用不可の場合は `null`
 */
export const readFilterRules = (logger: Logger): FilterRules | null => {
  const storedFilterRulesResult = readStorage(filterRulesStorageKey);
  if(storedFilterRulesResult.error != null) logger.error(storedFilterRulesResult.error);
  
  if(storedFilterRulesResult.result == null) {
    logger.log('キャッシュなし・API から取得が必要です');
    return null;
  }
  
  try {
    const parsed = filterRulesSchema.safeParse(JSON.parse(storedFilterRulesResult.result));
    if(!parsed.success) {
      logger.error('キャッシュの形式が異なります・API から取得が必要です');
      return null;
    }
    
    logger.log(`キャッシュ読込 (${storedFilterRulesResult.result.length} 文字)`);
    return parsed.data;
  }
  catch(error) {
    logger.error(`キャッシュ読込失敗・API から取得が必要です : ${describeError(error)}`);
    return null;
  }
};

/**
 * 判定用のフィルター条件を JSON 文字列にして LocalStorage に保存する
 * 
 * API 取得成功後に呼ぶ・カードへの反映は呼び出し側が別途行う
 * 保存失敗はログに通知し、呼び出し側が取得済みの条件を使う処理は継続できる
 */
export const saveFilterRules = (filterRules: FilterRules, logger: Logger): void => {
  const value = JSON.stringify(filterRules);
  const storedResult = writeStorage(filterRulesStorageKey, value);
  if(storedResult.error != null) {
    logger.error(storedResult.error);
  }
  else {
    logger.log(`キャッシュ保存 (${value.length} 文字)`);
  }
};
