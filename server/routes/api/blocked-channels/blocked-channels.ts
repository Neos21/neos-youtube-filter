import { Hono } from 'hono';

import { httpStatusCode } from '../../../../shared/constants/http-status-code';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { createBlockedChannelSchema, updateBlockedChannelSchema, upsertBlockedChannelSchema } from '../../../../shared/schemas/blocked-channel-schema';
import { invalidRequestBodyErrorMessage } from '../../../constants/server-constants';
import { parseId } from '../../../helpers/parse-id';
import { BlockedChannelsRepository } from '../../../repositories/blocked-channels-repository';
import { isSubscribedChannelConflictError } from '../../../services/resolve-subscribed-channel';
import { upsertBlockedChannel } from '../../../services/upsert-blocked-channel';

import type { HonoBindings } from '../../../types/hono-bindings';

export const blockedChannels = new Hono<{ Bindings: HonoBindings; }>();
export const blockedChannelsPath = '/blocked-channels' as const;

/** 全件取得する */
blockedChannels.get('/', async context => {
  const blockedChannels = await new BlockedChannelsRepository(context.env.DB).findAll();
  return context.json({ result: blockedChannels }, httpStatusCode.ok);
});

/** 1件取得する */
blockedChannels.get('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = parseId(context.req.param('id'));
  if(id.error != null) return context.json({ error: id.error }, httpStatusCode.badRequest);
  
  const blockedChannel = await new BlockedChannelsRepository(context.env.DB).findById(id.result);
  if(blockedChannel == null) return context.json({ error: '非表示チャンネルが存在しません' }, httpStatusCode.notFound);
  
  return context.json({ result: blockedChannel }, httpStatusCode.ok);
});

/** 1件追加する */
blockedChannels.post('/', async context => {
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  const parsed = createBlockedChannelSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  const blockedChannel = await new BlockedChannelsRepository(context.env.DB).create(parsed.data);
  if(blockedChannel == null) return context.json({ error: '非表示チャンネルの保存結果を取得できませんでした' }, httpStatusCode.internalServerError);
  
  return context.json({ result: blockedChannel }, httpStatusCode.created);
});

/** 1件更新する */
blockedChannels.patch('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = parseId(context.req.param('id'));
  if(id.error != null) return context.json({ error: id.error }, httpStatusCode.badRequest);
  
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  const parsed = updateBlockedChannelSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  const blockedChannel = await new BlockedChannelsRepository(context.env.DB).update(id.result, parsed.data);
  if(blockedChannel == null) return context.json({ error: '非表示チャンネルが存在しません' }, httpStatusCode.notFound);
  
  return context.json({ result: blockedChannel }, httpStatusCode.ok);
});

/** 購読済みチャンネルに一致すればそちらを補完し、それ以外をブロック済みチャンネルに追加・更新する */
blockedChannels.put('/', async context => {
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  const parsed = upsertBlockedChannelSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  const savedChannel = await upsertBlockedChannel(context.env.DB, parsed.data);
  if(savedChannel.error != null) {
    const status = isSubscribedChannelConflictError(savedChannel.error) ? httpStatusCode.conflict : httpStatusCode.internalServerError;
    return context.json({ error: savedChannel.error }, status);
  }
  
  return context.json({ result: savedChannel.result }, httpStatusCode.ok);
});

/** 1件削除する */
blockedChannels.delete('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = parseId(context.req.param('id'));
  if(id.error != null) return context.json({ error: id.error }, httpStatusCode.badRequest);
  
  const isDeleted = await new BlockedChannelsRepository(context.env.DB).delete(id.result);
  if(!isDeleted) return context.json({ error: '非表示チャンネルが存在しません' }, httpStatusCode.notFound);
  
  return context.json({ result: true }, httpStatusCode.ok);
});
