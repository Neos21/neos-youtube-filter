import { Hono } from 'hono';

import { httpStatusCode } from '../../../../shared/constants/http-status-code';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { createSubscribedChannelSchema, updateSubscribedChannelSchema, upsertSubscribedChannelSchema } from '../../../../shared/schemas/subscribed-channel-schema';
import { invalidRequestBodyErrorMessage } from '../../../constants/server-constants';
import { parseId } from '../../../helpers/parse-id';
import { SubscribedChannelsRepository } from '../../../repositories/subscribed-channels-repository';
import { isSubscribedChannelConflictError, resolveSubscribedChannel } from '../../../services/resolve-subscribed-channel';

import type { HonoBindings } from '../../../types/hono-bindings';

export const subscribedChannels = new Hono<{ Bindings: HonoBindings; }>();
export const subscribedChannelsPath = '/subscribed-channels' as const;

/** 全件取得する */
subscribedChannels.get('/', async context => {
  const subscribedChannels = await new SubscribedChannelsRepository(context.env.DB).findAll();
  return context.json({ result: subscribedChannels }, httpStatusCode.ok);
});

/** 1件取得する */
subscribedChannels.get('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = parseId(context.req.param('id'));
  if(id.error != null) return context.json({ error: id.error }, httpStatusCode.badRequest);
  
  const subscribedChannel = await new SubscribedChannelsRepository(context.env.DB).findById(id.result);
  if(subscribedChannel == null) return context.json({ error: '購読チャンネルが存在しません' }, httpStatusCode.notFound);
  
  return context.json({ result: subscribedChannel }, httpStatusCode.ok);
});

/** 1件追加する */
subscribedChannels.post('/', async context => {
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  const parsed = createSubscribedChannelSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  const subscribedChannel = await new SubscribedChannelsRepository(context.env.DB).create(parsed.data);
  if(subscribedChannel == null) return context.json({ error: '購読チャンネルの保存結果を取得できませんでした' }, httpStatusCode.internalServerError);
  
  return context.json({ result: subscribedChannel }, httpStatusCode.created);
});

/** 1件更新する */
subscribedChannels.patch('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = parseId(context.req.param('id'));
  if(id.error != null) return context.json({ error: id.error }, httpStatusCode.badRequest);
  
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  const parsed = updateSubscribedChannelSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  const subscribedChannel = await new SubscribedChannelsRepository(context.env.DB).update(id.result, parsed.data);
  if(subscribedChannel == null) return context.json({ error: '購読チャンネルが存在しません' }, httpStatusCode.notFound);
  
  return context.json({ result: subscribedChannel }, httpStatusCode.ok);
});

/** 1件追加または更新する */
subscribedChannels.put('/', async context => {
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  const parsed = upsertSubscribedChannelSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  const subscribedChannelsRepository = new SubscribedChannelsRepository(context.env.DB);
  const resolved = await resolveSubscribedChannel(subscribedChannelsRepository, parsed.data);
  if(resolved.error != null) return context.json({ error: resolved.error }, isSubscribedChannelConflictError(resolved.error) ? httpStatusCode.conflict : httpStatusCode.internalServerError);
  
  const subscribedChannel = resolved.result == null ?
    await subscribedChannelsRepository.upsert(parsed.data) :
    await subscribedChannelsRepository.update(resolved.result.id, parsed.data);
  if(subscribedChannel == null) return context.json({ error: '購読チャンネルの保存結果を取得できませんでした' }, httpStatusCode.internalServerError);
  
  return context.json({ result: subscribedChannel }, httpStatusCode.ok);
});

/** 1件削除する */
subscribedChannels.delete('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = parseId(context.req.param('id'));
  if(id.error != null) return context.json({ error: id.error }, httpStatusCode.badRequest);
  
  const isDeleted = await new SubscribedChannelsRepository(context.env.DB).delete(id.result);
  if(!isDeleted) return context.json({ error: '購読チャンネルが存在しません' }, httpStatusCode.notFound);
  
  return context.json({ result: true }, httpStatusCode.ok);
});
