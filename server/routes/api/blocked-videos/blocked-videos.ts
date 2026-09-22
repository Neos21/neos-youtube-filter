import { Hono } from 'hono';

import { httpStatusCode } from '../../../../shared/constants/http-status-code';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { createBlockedVideoSchema, updateBlockedVideoSchema, upsertBlockedVideoSchema } from '../../../../shared/schemas/blocked-video-schema';
import { invalidRequestBodyErrorMessage } from '../../../constants/server-constants';
import { parseId } from '../../../helpers/parse-id';
import { BlockedVideosRepository } from '../../../repositories/blocked-videos-repository';

import type { HonoBindings } from '../../../types/hono-bindings';

export const blockedVideos = new Hono<{ Bindings: HonoBindings; }>();
export const blockedVideosPath = '/blocked-videos' as const;

/** 全件取得する */
blockedVideos.get('/', async context => {
  const blockedVideos = await new BlockedVideosRepository(context.env.DB).findAll();
  return context.json({ result: blockedVideos }, httpStatusCode.ok);
});

/** 1件取得する */
blockedVideos.get('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = parseId(context.req.param('id'));
  if(id.error != null) return context.json({ error: id.error }, httpStatusCode.badRequest);
  
  const blockedVideo = await new BlockedVideosRepository(context.env.DB).findById(id.result);
  if(blockedVideo == null) return context.json({ error: '非表示動画が存在しません' }, httpStatusCode.notFound);
  
  return context.json({ result: blockedVideo }, httpStatusCode.ok);
});

/** 1件追加する */
blockedVideos.post('/', async context => {
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  const parsed = createBlockedVideoSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  const blockedVideo = await new BlockedVideosRepository(context.env.DB).create(parsed.data);
  if(blockedVideo == null) return context.json({ error: '非表示動画の保存結果を取得できませんでした' }, httpStatusCode.internalServerError);
  
  return context.json({ result: blockedVideo }, httpStatusCode.created);
});

/** 1件更新する */
blockedVideos.patch('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = parseId(context.req.param('id'));
  if(id.error != null) return context.json({ error: id.error }, httpStatusCode.badRequest);
  
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  const parsed = updateBlockedVideoSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  const blockedVideo = await new BlockedVideosRepository(context.env.DB).update(id.result, parsed.data);
  if(blockedVideo == null) return context.json({ error: '非表示動画が存在しません' }, httpStatusCode.notFound);
  
  return context.json({ result: blockedVideo }, httpStatusCode.ok);
});

/** 1件追加または更新する */
blockedVideos.put('/', async context => {
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  const parsed = upsertBlockedVideoSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  const blockedVideo = await new BlockedVideosRepository(context.env.DB).upsert(parsed.data);
  if(blockedVideo == null) return context.json({ error: '非表示動画の保存結果を取得できませんでした' }, httpStatusCode.internalServerError);
  
  return context.json({ result: blockedVideo }, httpStatusCode.ok);
});

/** 1件削除する */
blockedVideos.delete('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = parseId(context.req.param('id'));
  if(id.error != null) return context.json({ error: id.error }, httpStatusCode.badRequest);
  
  const isDeleted = await new BlockedVideosRepository(context.env.DB).delete(id.result);
  if(!isDeleted) return context.json({ error: '非表示動画が存在しません' }, httpStatusCode.notFound);
  
  return context.json({ result: true }, httpStatusCode.ok);
});
