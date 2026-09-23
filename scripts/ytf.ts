import { extractYouTubeCards } from './dom/extract-youtube-cards';
import { getYouTubePage } from './dom/get-youtube-page';
import { createPageFilter } from './filter/create-page-filter';
import { readStorage, writeStorage } from './helpers/storage';
import { createFilterRulesStore } from './state/create-filter-rules-store';
import { createFilterControls } from './ui/create-filter-controls';
import { createLogger } from './ui/create-logger';

import type { YouTubeCard } from './types/youtube-card';
import type { YtfRuntime } from './types/ytf-runtime';
import type { FilterRules } from '../shared/types/app/filter-rules';

((): void => {
  // 本スクリプト起動中なら何もしない・失敗やキャンセル後は既存の入口で再試行する
  if(window.__YTF__ != null) {
    if(!['starting', 'ready'].includes(window.__YTF__.status)) void window.__YTF__.refresh();
    return;
  }
  // YouTube 上で実行されていない場合は何もしない
  if(!['www.youtube.com', 'm.youtube.com'].includes(location.hostname)) return;
  // フレーム内のページでないことを確認する
  if(window.top !== window.self) return;
  
  /** API のベース URL */
  const apiUrl = 'https://ytf.neos21.workers.dev/api';
  /** デバッグ表示の保存キー・トークンやキャッシュとは独立して保持する */
  const debugStorageKey = 'ytf:debug';
  /** DOM の準備待ちも初期化中として扱い、重複評価による先行リクエストを防ぐ */
  let initialized = false;
  const logger = createLogger();
  const filterRulesStore = createFilterRulesStore(apiUrl, logger, (filterRules: FilterRules): void => pageFilter.updateFilterRules(filterRules));
  const pageFilter = createPageFilter(logger, (): void => { void filterRulesStore.refresh(); }, (): void => renderControls());
  const controls = createFilterControls(
    (enabled: boolean): void => pageFilter.setEnabled(enabled),
    (enabled: boolean): void => setDebug(enabled),
    (): void => { void filterRulesStore.refresh(); }
  );
  
  /** 状態の所有者から操作欄に反映する・操作欄自体には別の状態を持たせない */
  const renderControls = (): void => controls.render(pageFilter.enabled, logger.debug, getYouTubePage(new URL(location.href)) != null);
  
  /** 保存できない場合も現在のページではデバッグ表示を切り替える */
  const setDebug = (enabled: boolean): void => {
    logger.setDebug(enabled);
    const stored = writeStorage(debugStorageKey, String(enabled));
    if(stored.error != null) logger.error(stored.error);
    renderControls();
  };
  
  /** 監視・UI を解除し、再評価で初期化し直せる状態にする */
  const destroy = (): void => {
    document.removeEventListener('DOMContentLoaded', start);
    pageFilter.destroy();
    controls.destroy();
    logger.log('監視と UI を解除');
    logger.destroy();
    delete window.__YTF__;
  };
  
  /** DOM の準備後に画面を用意し、キャッシュを反映してから API を呼び出す */
  const start = (): void => {
    initialized = true;
    const stored = readStorage(debugStorageKey);
    if(stored.error != null) logger.error(stored.error);
    logger.setDebug(stored.result === 'true');
    logger.log('起動');
    pageFilter.start();
    filterRulesStore.restoreCache();
    void filterRulesStore.refresh();
  };
  
  // 入力や通信を始める前に状態を公開し、初期化中の重複評価も防ぐ
  window.__YTF__ = {
    get status(): YtfRuntime['status'] { return initialized ? filterRulesStore.status : 'starting'; },
    get filterRules(): FilterRules | null { return filterRulesStore.filterRules; },
    get fetchedAt(): string | null { return filterRulesStore.fetchedAt; },
    get error(): string { return filterRulesStore.error; },
    get page(): YtfRuntime['page'] { return getYouTubePage(new URL(location.href)); },
    get enabled(): boolean { return pageFilter.enabled; },
    get debug(): boolean { return logger.debug; },
    getCards: (): Array<YouTubeCard> => extractYouTubeCards(document, new URL(location.href)),
    refresh: filterRulesStore.refresh,
    updateFilterRules: filterRulesStore.updateFilterRules,
    setEnabled: pageFilter.setEnabled,
    setDebug,
    destroy
  };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
