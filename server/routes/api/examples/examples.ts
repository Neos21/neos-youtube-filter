import { Hono } from 'hono';
import { jwt } from 'hono/jwt';

import { httpStatusCode } from '../../../../shared/constants/http-status-code';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { exampleSchema } from '../../../../shared/schemas/example-schema';
import { invalidIdErrorMessage, invalidRequestBodyErrorMessage } from '../../../constants/server-constants';
import { ExamplesRepository } from '../../../repositories/examples-repository';

import type { HonoBindings } from '../../../types/hono-bindings';

export const examples = new Hono<{ Bindings: HonoBindings; }>();
export const examplesPath = '/examples' as const;

// JWT 認証を行う
examples.use((context, next) => jwt({ secret: context.env.ADMIN_JWT_SECRET, alg: 'HS256' })(context, next));

/** 一覧を取得する */
examples.get('/', async context => {
  const examples = await new ExamplesRepository(context.env.DB).findAll();
  return context.json({ result: examples }, httpStatusCode.ok);
});

/** 1件取得する */
examples.get('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = Number(context.req.param('id'));
  if(!Number.isInteger(id)) return context.json({ error: invalidIdErrorMessage }, httpStatusCode.badRequest);
  
  const example = await new ExamplesRepository(context.env.DB).findById(id);
  if(example == null) return context.json({ error: 'データが存在しません' }, httpStatusCode.notFound);
  
  return context.json({ result: example }, httpStatusCode.ok);
});

/** 1件追加する */
examples.post('/', async context => {
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  const parsed = exampleSchema.partial().safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  const id = await new ExamplesRepository(context.env.DB).create(parsed.data);
  return context.json({ result: { id } }, httpStatusCode.created);
});

/** 1件更新する */
examples.patch('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = Number(context.req.param('id'));
  if(!Number.isInteger(id)) return context.json({ error: invalidIdErrorMessage }, httpStatusCode.badRequest);
  
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  const parsed = exampleSchema.partial().safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  await new ExamplesRepository(context.env.DB).update(id, parsed.data);
  return context.json({ result: { id } }, httpStatusCode.ok);
});

/** 1件削除する */
examples.delete('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = Number(context.req.param('id'));
  if(!Number.isInteger(id)) return context.json({ error: invalidIdErrorMessage }, httpStatusCode.badRequest);
  
  await new ExamplesRepository(context.env.DB).delete(id);
  return context.json({ result: { id } }, httpStatusCode.ok);
});
