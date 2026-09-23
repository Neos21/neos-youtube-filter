import { createCardMatcher } from './create-card-matcher';
import { extractYouTubeCards } from '../dom/extract-youtube-cards';
import { getYouTubePage } from '../dom/get-youtube-page';

import type { FilterRules } from '../../shared/types/app/filter-rules';
import type { YouTubeCard } from '../types/youtube-card';
import type { Logger } from '../ui/create-logger';

/** ページ内の非表示処理と監視の操作 */
type PageFilter = {
  readonly enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  updateFilterRules: (filterRules: FilterRules) => void;
  start: () => void;
  destroy: () => void;
};

/**
 * 非表示クラスを付け外しし、SPA 遷移・追加読込・カード再利用に追従する
 * 
 * 自身の UI 更新とクラス操作を監視から除外し、短時間の DOM 変更はまとめて処理する
 */
export const createPageFilter = (logger: Logger, onNavigate: () => void, onChange: () => void): PageFilter => {
  const style = document.createElement('style');
  style.dataset.ytfUi = 'style';
  style.textContent = '.ytf-hidden { display: none !important; }';  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  /** 本スクリプトが隠した要素だけを復元するための集合 */
  const hiddenElements = new Set<HTMLElement>();
  let enabled = false;
  let started = false;
  let pageUrl = '';
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let matchCard: (card: YouTubeCard) => string | null = (): null => null;
  let previousSummary = '';
  
  /** 自身が隠したカードをすべて復元する・既存のインラインスタイルには触れない */
  const restore = (): void => {
    for(const element of hiddenElements) element.classList.remove('ytf-hidden');
    hiddenElements.clear();
  };
  
  /** 同じ URL の追加描画では手動の ON/OFF を保持する・ハッシュだけの変更も保持する */
  const updatePage = (): void => {
    const url = new URL(location.href);
    url.hash = '';
    if(pageUrl === url.href) return;
    const initial = pageUrl === '';
    pageUrl = url.href;
    const page = getYouTubePage(url);
    enabled = page != null && page.type !== 'search';
    restore();
    logger.log(`ページ変更 : ${page?.site ?? '対象外'} / ${page?.type ?? '対象外'}・非表示 ${enabled ? 'ON' : 'OFF'}`);
    onChange();
    if(!initial && page != null) onNavigate();
  };
  
  /** 再利用されたカードも毎回抽出し直し、一致しなくなった要素を復元する */
  const processCards = (): void => {
    timeout = null;
    if(!started) return;
    updatePage();
    if(!style.isConnected) (document.head ?? document.documentElement).append(style);
    const cards = extractYouTubeCards(document, new URL(location.href));
    const nextHiddenElements = new Set<HTMLElement>();
    if(enabled) {
      for(const card of cards) {
        const reason = matchCard(card);
        if(reason == null) continue;
        nextHiddenElements.add(card.element);
        if(!hiddenElements.has(card.element)) logger.log(`非表示 : ${card.videoId} (${reason})`);
        card.element.classList.add('ytf-hidden');
      }
    }
    for(const element of hiddenElements) {
      if(!nextHiddenElements.has(element)) element.classList.remove('ytf-hidden');
    }
    hiddenElements.clear();
    for(const element of nextHiddenElements) hiddenElements.add(element);
    const summary = `カード ${cards.length} 件・非表示 ${hiddenElements.size} 件・非表示機能 ${enabled ? 'ON' : 'OFF'}`;
    if(summary !== previousSummary) logger.log(summary);
    previousSummary = summary;
  };
  
  /** 連続する DOM 更新でも処理が無期限に延期されないよう最初の変更で予約する */
  const schedule = (): void => {
    if(started && timeout == null) timeout = setTimeout(processCards, 100);
  };
  
  /** 自身の UI に対する変更か否か・テキストノードも親要素で判定する */
  const isOwnNode = (node: Node): boolean => (node instanceof Element ? node : node.parentElement)?.closest('[data-ytf-ui]') != null;
  
  /** 非表示クラス以外のクラス変更だけを識別する */
  const withoutHiddenClass = (value: string | null): string => (value ?? '').split((/\s+/)).filter(className => className !== 'ytf-hidden' && className !== '').join(' ');
  
  const observer = new MutationObserver(records => {
    const changed = records.some(record => {
      if(isOwnNode(record.target)) return false;
      if(record.type === 'attributes' && record.attributeName === 'class' && record.target instanceof Element) {
        return withoutHiddenClass(record.oldValue) !== withoutHiddenClass(record.target.getAttribute('class'));
      }
      if(record.type === 'childList') return [...record.addedNodes, ...record.removedNodes].some(node => !isOwnNode(node));
      return true;
    });
    if(changed) schedule();
  });
  
  /** 遷移通知時に初期状態を反映する・描画が遅れる部分は監視側でも処理する */
  const onNavigatePage = (): void => {
    updatePage();
    schedule();
  };
  
  return {
    get enabled(): boolean { return enabled; },
    setEnabled: (nextEnabled: boolean): void => {
      enabled = getYouTubePage(new URL(location.href)) != null && nextEnabled;
      logger.log(`非表示切替 ${enabled ? 'ON' : 'OFF'}`);
      if(!enabled) restore();
      onChange();
      schedule();
    },
    updateFilterRules: (filterRules: FilterRules): void => {
      matchCard = createCardMatcher(filterRules, logger);
      schedule();
    },
    start: (): void => {
      if(started) return;
      started = true;
      updatePage();
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeOldValue: true,
        attributeFilter: ['href', 'src', 'data-src', 'title', 'aria-label', 'hidden', 'class', 'data-style', 'section-identifier', 'page-subtype']
      });
      window.addEventListener('yt-navigate-finish', onNavigatePage);
      window.addEventListener('popstate', onNavigatePage);
      processCards();
    },
    destroy: (): void => {
      started = false;
      observer.disconnect();
      if(timeout != null) clearTimeout(timeout);
      timeout = null;
      window.removeEventListener('yt-navigate-finish', onNavigatePage);
      window.removeEventListener('popstate', onNavigatePage);
      restore();
      style.remove();
    }
  };
};
