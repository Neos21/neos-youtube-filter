import { SubscribedChannelsRepository } from '../repositories/subscribed-channels-repository';

import type { UpsertSubscribedChannel } from '../../shared/schemas/subscribed-channel-schema';
import type { SubscribedChannel } from '../../shared/types/entities/subscribed-channel';
import type { Result } from '../../shared/types/utilities/result';

/** 送信されたハンドルと ID が別々の購読済みレコードを指す場合のエラー */
export const separateSubscribedChannelsErrorMessage = 'ハンドルとチャンネル ID が別々の購読済みレコードに一致します';
/** 参考タイトルが複数の購読済みレコードと完全一致した場合のエラー */
export const duplicateSubscribedChannelTitleErrorMessage = '同じチャンネル名の購読済みレコードが複数あります';
/** 特定した購読済みレコードの識別子と送信内容が矛盾する場合のエラー */
export const conflictingSubscribedChannelErrorMessage = '購読済みチャンネルの識別子が登録済みの値と一致しません';

/** 解決処理が返すエラーを HTTP 409 として扱うための判定関数 */
export const isSubscribedChannelConflictError = (error: string): boolean => error === separateSubscribedChannelsErrorMessage || error === duplicateSubscribedChannelTitleErrorMessage || error === conflictingSubscribedChannelErrorMessage;

/**
 * PUT の識別子または参考タイトルから、更新対象の購読済みチャンネルを一意に特定する
 * 
 * ハンドル・ID を先に照合し、一致しない場合だけタイトルの完全一致を調べる
 * タイトルは補助キーなので、同名が複数ある場合や既存の識別子と矛盾する場合は更新対象にしない
 * 
 * @returns 更新対象のレコード・該当なしは `null`、曖昧または矛盾があればエラー
 */
export const resolveSubscribedChannel = async (subscribedChannelsRepository: SubscribedChannelsRepository, channel: UpsertSubscribedChannel): Promise<Result<SubscribedChannel | null>> => {
  const identifierMatches = await subscribedChannelsRepository.findByIdentifiers(channel.handle ?? null, channel.channel_id ?? null);
  if(identifierMatches.length > 1) return { error: separateSubscribedChannelsErrorMessage };
  
  let subscribedChannel = identifierMatches[0];
  if(subscribedChannel == null && channel.title != null) {
    const titleMatches = await subscribedChannelsRepository.findByTitle(channel.title);
    if(titleMatches.length > 1) return { error: duplicateSubscribedChannelTitleErrorMessage };
    
    subscribedChannel = titleMatches[0];
  }
  
  if(subscribedChannel != null && ((channel.handle != null && subscribedChannel.handle != null && channel.handle !== subscribedChannel.handle) || (channel.channel_id != null && subscribedChannel.channel_id != null && channel.channel_id !== subscribedChannel.channel_id))) {
    return { error: conflictingSubscribedChannelErrorMessage };
  }
  
  return { result: subscribedChannel ?? null };
};
