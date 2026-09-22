import { Hono } from 'hono';

import { httpStatusCode } from '../../../../shared/constants/http-status-code';
import { BlockedChannelsRepository } from '../../../repositories/blocked-channels-repository';
import { BlockedPatternsRepository } from '../../../repositories/blocked-patterns-repository';
import { BlockedVideosRepository } from '../../../repositories/blocked-videos-repository';
import { SubscribedChannelsRepository } from '../../../repositories/subscribed-channels-repository';

import type { FilterRules } from '../../../../shared/types/app/filter-rules';
import type { HonoBindings } from '../../../types/hono-bindings';

export const filterRules = new Hono<{ Bindings: HonoBindings; }>();
export const filterRulesPath = '/filter-rules' as const;

/** 全テーブルのフィルター条件を取得する・取得失敗は空配列で代用せずリクエスト全体を失敗とする */
filterRules.get('/', async context => {
  const [blockedVideos, blockedChannels, blockedPatterns, subscribedChannels] = await Promise.all([
    new BlockedVideosRepository(context.env.DB).findAll(),
    new BlockedChannelsRepository(context.env.DB).findAll(),
    new BlockedPatternsRepository(context.env.DB).findAll(),
    new SubscribedChannelsRepository(context.env.DB).findAll()
  ]);
  const result: FilterRules = {
    blocked_videos     : blockedVideos,
    blocked_channels   : blockedChannels,
    blocked_patterns   : blockedPatterns,
    subscribed_channels: subscribedChannels
  };
  return context.json({ result }, httpStatusCode.ok);
});
