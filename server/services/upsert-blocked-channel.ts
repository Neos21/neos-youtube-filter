import { resolveSubscribedChannel } from './resolve-subscribed-channel';
import { BlockedChannelsRepository } from '../repositories/blocked-channels-repository';
import { SubscribedChannelsRepository } from '../repositories/subscribed-channels-repository';

import type { UpsertBlockedChannel } from '../../shared/schemas/blocked-channel-schema';
import type { BlockedChannel } from '../../shared/types/entities/blocked-channel';
import type { SubscribedChannel } from '../../shared/types/entities/subscribed-channel';
import type { Result } from '../../shared/types/utilities/result';

/** ブロック登録の送信先と、保存されたチャンネルの全カラムを含む結果 */
export type SavedChannel = (BlockedChannel | SubscribedChannel) & {
  /** 実際に更新したテーブル・メインスクリプトの条件更新先を選ぶために返す */
  source: 'blocked' | 'subscribed';
};

/**
 * チャンネルのブロック登録要求を、既存の購読済み情報と照合して保存する
 * 
 * 購読済みの識別子が一致した場合は購読レコードを補完し、それ以外はブロックレコードを登録する
 * 同じ種類の識別子が既存レコードと食い違う場合や、2つの購読レコードに分かれて一致する場合は誤更新を避ける
 * 
 * @returns 保存先と保存結果・識別子の競合時や結果を取得できなかった場合はエラーメッセージ
 */
export const upsertBlockedChannel = async (db: D1Database, channel: UpsertBlockedChannel): Promise<Result<SavedChannel>> => {
  const subscribedChannelsRepository = new SubscribedChannelsRepository(db);
  const resolved = await resolveSubscribedChannel(subscribedChannelsRepository, channel);
  if(resolved.error != null) return { error: resolved.error };
  
  const subscribedChannel = resolved.result;
  if(subscribedChannel != null) {
    const saved = await subscribedChannelsRepository.update(subscribedChannel.id, channel);
    if(saved == null) return { error: '購読済みチャンネルの保存結果を取得できませんでした' };
    
    return { result: { ...saved, source: 'subscribed' } };
  }
  
  const saved = await new BlockedChannelsRepository(db).upsert(channel);
  if(saved == null) return { error: '非表示チャンネルの保存結果を取得できませんでした' };
  
  return { result: { ...saved, source: 'blocked' } };
};
