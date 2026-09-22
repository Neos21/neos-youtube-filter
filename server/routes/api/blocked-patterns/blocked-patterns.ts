import { Hono } from 'hono';

import { httpStatusCode } from '../../../../shared/constants/http-status-code';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { createBlockedPatternSchema, updateBlockedPatternSchema } from '../../../../shared/schemas/blocked-pattern-schema';
import { invalidRequestBodyErrorMessage } from '../../../constants/server-constants';
import { parseId } from '../../../helpers/parse-id';
import { BlockedPatternsRepository } from '../../../repositories/blocked-patterns-repository';

import type { HonoBindings } from '../../../types/hono-bindings';

export const blockedPatterns = new Hono<{ Bindings: HonoBindings; }>();
export const blockedPatternsPath = '/blocked-patterns' as const;

/** 全件取得する */
blockedPatterns.get('/', async context => {
  const blockedPatterns = await new BlockedPatternsRepository(context.env.DB).findAll();
  return context.json({ result: blockedPatterns }, httpStatusCode.ok);
});

/** 1件取得する */
blockedPatterns.get('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = parseId(context.req.param('id'));
  if(id.error != null) return context.json({ error: id.error }, httpStatusCode.badRequest);
  
  const blockedPattern = await new BlockedPatternsRepository(context.env.DB).findById(id.result);
  if(blockedPattern == null) return context.json({ error: '非表示パターンが存在しません' }, httpStatusCode.notFound);
  
  return context.json({ result: blockedPattern }, httpStatusCode.ok);
});

/** 1件追加する */
blockedPatterns.post('/', async context => {
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  const parsed = createBlockedPatternSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  const blockedPattern = await new BlockedPatternsRepository(context.env.DB).create(parsed.data);
  if(blockedPattern == null) return context.json({ error: '非表示パターンの保存結果を取得できませんでした' }, httpStatusCode.internalServerError);
  
  return context.json({ result: blockedPattern }, httpStatusCode.created);
});

/** 1件更新する */
blockedPatterns.patch('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = parseId(context.req.param('id'));
  if(id.error != null) return context.json({ error: id.error }, httpStatusCode.badRequest);
  
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  const parsed = updateBlockedPatternSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  const blockedPattern = await new BlockedPatternsRepository(context.env.DB).update(id.result, parsed.data);
  if(blockedPattern == null) return context.json({ error: '非表示パターンが存在しません' }, httpStatusCode.notFound);
  
  return context.json({ result: blockedPattern }, httpStatusCode.ok);
});

/** 1件削除する */
blockedPatterns.delete('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = parseId(context.req.param('id'));
  if(id.error != null) return context.json({ error: id.error }, httpStatusCode.badRequest);
  
  const isDeleted = await new BlockedPatternsRepository(context.env.DB).delete(id.result);
  if(!isDeleted) return context.json({ error: '非表示パターンが存在しません' }, httpStatusCode.notFound);
  
  return context.json({ result: true }, httpStatusCode.ok);
});
