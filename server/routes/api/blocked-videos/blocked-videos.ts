import { Hono } from 'hono';

import { httpStatusCode } from '../../../../shared/constants/http-status-code';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { createBlockedVideoSchema, updateBlockedVideoSchema } from '../../../../shared/schemas/blocked-video-schema';
import { invalidRequestBodyErrorMessage } from '../../../constants/server-constants';
import { parseId } from '../../../helpers/parse-id';
import { BlockedVideosRepository } from '../../../repositories/blocked-videos-repository';

import type { HonoBindings } from '../../../types/hono-bindings';

export const blockedVideos = new Hono<{ Bindings: HonoBindings; }>();
export const blockedVideosPath = '/blocked-videos' as const;

/** 一覧を取得する */
blockedVideos.get('/', async context => {
  const blockedVideos = await new BlockedVideosRepository(context.env.DB).findAll();
  return context.json({ result: blockedVideos }, httpStatusCode.ok);
});

/** 1件取得する・存在しなければ 404 を返す */
blockedVideos.get('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = parseId(context.req.param('id'));
  if(id.error != null) return context.json({ error: id.error }, httpStatusCode.badRequest);
  
  const blockedVideo = await new BlockedVideosRepository(context.env.DB).findById(id.result);
  if(blockedVideo == null) return context.json({ error: '非表示動画が存在しません' }, httpStatusCode.notFound);
  
  return context.json({ result: blockedVideo }, httpStatusCode.ok);
});

/** 1件追加する : 新規登録は 201、同じ動画の再登録となった場合は既存レコードを 200 で返す */
blockedVideos.post('/', async context => {
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  const parsed = createBlockedVideoSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  const createResult = await new BlockedVideosRepository(context.env.DB).create(parsed.data);
  if(createResult.error != null) return context.json({ error: createResult.error }, httpStatusCode.internalServerError);
  
  return context.json({ result: createResult.result.blockedVideo }, createResult.result.isCreated ? httpStatusCode.created : httpStatusCode.ok);
});

/** 1件更新する */
blockedVideos.patch('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = parseId(context.req.param('id'));
  if(id.error != null) return context.json({ error: id.error }, httpStatusCode.badRequest);
  
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  const parsed = updateBlockedVideoSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  const updateResult = await new BlockedVideosRepository(context.env.DB).update(id.result, parsed.data);
  if(updateResult.error != null) return context.json({ error: updateResult.error }, httpStatusCode.internalServerError);
  if(updateResult.result == null) return context.json({ error: '非表示動画が存在しません' }, httpStatusCode.notFound);
  
  return context.json({ result: updateResult.result }, httpStatusCode.ok);
});

/** 1件削除する・存在しない場合は 404 を返す */
blockedVideos.delete('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = parseId(context.req.param('id'));
  if(id.error != null) return context.json({ error: id.error }, httpStatusCode.badRequest);
  
  const isDeleted = await new BlockedVideosRepository(context.env.DB).delete(id.result);
  if(!isDeleted) return context.json({ error: '非表示動画が存在しません' }, httpStatusCode.notFound);
  
  return context.json({ result: true }, httpStatusCode.ok);
});
