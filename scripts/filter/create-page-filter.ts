import { createCardMatcher } from './create-card-matcher';
import { cardProcessingDelayMilliseconds } from '../constants';
import { getYouTubePage } from '../dom/get-youtube-page';
import { youTubeSelectors } from '../dom/youtube-selectors';
import { createBlockChannelButtons } from '../ui/create-block-channel-buttons';
import { createBlockVideoButtons } from '../ui/create-block-video-buttons';

import type { Result } from '../../shared/types/utilities/result';
import type { ChannelRegistration } from '../dom/get-channel-registration';
import type { VideoRegistration } from '../dom/get-video-registration';
import type { FilterRules } from '../schemas/filter-rules-schema';
import type { Logger } from '../ui/create-menu';

/**
 * ページ内の動画カードを非表示・復元し、DOM の変化を監視するオブジェクトを作る
 * 
 * 生成しただけでは監視を始めない
 * 起動側で `updateFilterRules()` に条件を渡し、`start()` で現在のページの処理と監視を開始する
 * 取得に失敗して条件を渡さなかった場合は、監視を始めてもカードを隠さない
 * 
 * @param enabledElement 非表示 ON・OFF のチェックボックス : 現在のチェック状態を判定に使い、ページ移動時は初期値に書き換える
 * @param logger ロガー : 非表示・復元の対象、処理件数、監視開始・停止を出力する
 * @param registerVideo 動画の登録と条件更新を行う処理・ボタン配置と同じカード走査から利用する
 * @param registerChannel チャンネルの登録と条件更新を行う処理・動画ボタンと同じカード走査から利用する
 * @returns `start` は監視開始、`stop` は監視停止と表示復元、`updateFilterRules` は条件の差し替えと全カードの再判定を行う
 */
export const createPageFilter = (
  enabledElement: HTMLInputElement,
  logger: Logger,
  registerVideo: (video: VideoRegistration) => Promise<Result<string>>,
  registerChannel: (channel: ChannelRegistration) => Promise<Result<string>>
): {
  /** CSS とイベント監視を登録し、現在のページを処理する・起動時に一度呼ぶ */
  start: () => void;
  /** 監視と予約処理を解除し、隠したカードを復元する・認証失敗による終了時に呼ぶ */
  stop: () => void;
  /** 照合に使う条件を差し替える・監視中なら全カードの再判定も予約する */
  updateFilterRules: (filterRules: FilterRules) => void;
} => {
  /** カードごとの動画登録ボタン・ページ移動と停止時はまとめて解除する */
  const blockVideoButtons = createBlockVideoButtons(registerVideo, logger);
  /** カードごとのチャンネル登録ボタン・動画ボタンと同じ処理対象に配置する */
  const blockChannelButtons = createBlockChannelButtons(registerChannel, logger);
  
  /** 個別の動画カードに該当する要素を探す CSS セレクタ・候補タグを OR 条件で連結したもの */
  const cardSelector = youTubeSelectors.cards.join(', ');
  
  /** 次回の非表示判定で調べるカードの集合・同じカードへの複数の変更通知を1件にまとめる */
  const pendingElements = new Set<HTMLElement>();
  /** 本スクリプトが隠したカードと一致理由の対応表 : 表示復元と理由の変化のログ出力に使う */
  const hiddenElements = new Map<HTMLElement, string>();
  
  /** 非表示クラスの CSS を持つ要素 : 監視開始時にページに挿入し、停止時に取り除く */
  const styleElement = document.createElement('style');
  styleElement.dataset.ytfUi = 'style';
  /* eslint-disable neos-eslint-plugin/comment-colon-spacing */
  styleElement.textContent = `
    .ytf-hidden {
      display: none !important;
    }
    
    :has(> [data-ytf-ui="video-button"], > [data-ytf-ui="channel-button"]) {
      position: relative !important;
    }
    
    [data-ytf-ui="video-button"], [data-ytf-ui="channel-button"] {
      position: absolute;
      top: .25rem;
      left: .25rem;
      z-index: 999999999;
      max-width: calc(100% - 8px);
      padding: .25rem .5rem;
      border: 1px solid #888;
      border-radius: 4px;
      color: #111;
      background: #fff;
      font-size: 13px;
      cursor: pointer;
    }
    :has(> [data-ytf-ui="video-button"]) > [data-ytf-ui="channel-button"] {
      top: auto;
      bottom: .25rem;
    }
    [data-ytf-ui="video-button"]:disabled, [data-ytf-ui="channel-button"]:disabled {
      opacity: .6;
      cursor: wait;
    }
  `;
  /* eslint-enable neos-eslint-plugin/comment-colon-spacing */
  
  /** 現在のページでカードを探す領域の CSS セレクタ・空文字は対象外ページを表す */
  let rootSelectors = '';
  /** 現在のフィルター対象ページの URL : 初回は空文字で、`onNavigate()` がハッシュを除いて保存し、次の遷移判定に使う */
  let currentPageUrl = '';
  /** フィルターが稼働中か否か : `start()` から `stop()` まで `true` となり、DOM 変更やタイマーの待機中も含む */
  let isRunning = false;
  /** 次回に全カードの処理が必要か否か : `processAll()` で `true` にし、`processCards()` で候補を収集する際に `false` に戻す */
  let needsAllCardsProcessing = false;
  /** 予約済みのカード処理のタイマー ID・`null` は未予約であり、重複予約を防ぐために保持する */
  let timerId: ReturnType<typeof setTimeout> | null = null;
  /** 最後にカード処理件数をログへ出した時刻・同じ1枚の再処理が続く場合のログ量を抑える */
  let lastCardProcessingLogAt = 0;
  /** カードに一致した非表示条件の理由を返す関数・条件を読み込むまでは常に `null` を返す */
  let matches: (element: HTMLElement) => string | null = (): null => null;
  
  /** カードのタグ名と先頭リンクをログ用の説明文字列にする・動画 ID の抽出や照合には使わない */
  const describeCard = (element: HTMLElement): string => `${element.tagName.toLowerCase()} ${element.querySelector('a[href]')?.getAttribute('href') ?? 'リンクなし'}`;
  
  /** 非表示にしたカードを元の表示に戻し、管理対象から外す・`hiddenElements` にない要素には触れない */
  const restoreElement = (element: HTMLElement): void => {
    const reason = hiddenElements.get(element);
    if(reason == null) return;
    element.classList.remove('ytf-hidden');
    hiddenElements.delete(element);
    logger.log(`復元 : ${describeCard(element)} (${reason})`);
  };
  
  /**
   * 指定箇所に関係するカードを処理待ちの集合に追加する・ここでは表示状態を変えない
   * 
   * 例えば `ytd-rich-item-renderer` 内に `yt-lockup-view-model` がある場合、外側を1枚のカードとして登録する
   * 複数動画を並べる棚を含む親には広げず、棚全体を1枚として隠さないようにする
   * 
   * @param element DOM が変更された要素、追加された要素、または全件探索する領域
   * @param descendants `false` は自身または最も近い親カードを探し、`true` は子孫に含まれるカードも探す
   */
  const collectElement = (element: Element, descendants = false): void => {
    // タイトルの文字変更なら所属カードを、新しい一覧の追加ならその中のカードも候補にする
    const candidates = [element.closest<HTMLElement>(cardSelector), ...(descendants ? element.querySelectorAll<HTMLElement>(cardSelector) : [])];
    for(let card of candidates) {
      if(card == null) continue;
      let parent = card.parentElement?.closest<HTMLElement>(cardSelector);
      while(parent != null && parent.querySelector(youTubeSelectors.containers) == null) {
        card = parent;
        parent = card.parentElement?.closest<HTMLElement>(cardSelector);
      }
      pendingElements.add(card);
    }
  };
  
  /**
   * 処理待ちのカードに現在の条件を適用し、非表示クラスを付け外しする
   * 
   * `schedule()` が予約したタイマーから実行する
   * 全件処理の要求があれば探索範囲内のカードを追加し、それ以外は変更されたカードだけを調べる
   * 判定後は処理待ちを空にし、非表示のカードと一致理由だけを保持する
   */
  const processCards = (): void => {
    timerId = null;
    if(!isRunning) return;
    
    if(needsAllCardsProcessing) {
      needsAllCardsProcessing = false;
      if(rootSelectors !== '') document.querySelectorAll(rootSelectors).forEach(root => collectElement(root, true));
      // 探索範囲から外れたカードも再判定に含め、以前付けた非表示クラスを残さない
      hiddenElements.forEach((_reason, element) => pendingElements.add(element));
    }
    
    const count = pendingElements.size;
    /** この回で非表示または復元の判定結果が変わったか否か */
    let hasVisibilityChange = false;
    for(const element of pendingElements) {
      /** 現在の探索範囲にある個別カードか否か・削除済み要素、広告、棚などは対象外 */
      const isEligible = rootSelectors !== '' && element.isConnected && element.closest(rootSelectors) != null && element.closest(youTubeSelectors.excludes) == null && element.querySelector(youTubeSelectors.containers) == null;
      blockVideoButtons.update(element, isEligible);
      blockChannelButtons.update(element, isEligible);
      
      // OFF・対象外・条件不一致はすべて `null` とし、以前隠したカードなら復元する
      const reason = enabledElement.checked && isEligible ? matches(element) : null;
      if((hiddenElements.get(element) ?? null) !== reason) hasVisibilityChange = true;
      if(reason == null) {
        restoreElement(element);  // 表示状態に戻す
      }
      else {
        if(hiddenElements.get(element) !== reason) logger.log(`非表示 : ${describeCard(element)} (${reason})`);
        hiddenElements.set(element, reason);
        if(!element.classList.contains('ytf-hidden')) element.classList.add('ytf-hidden');  // 非表示にする
      }
    }
    
    pendingElements.clear();
    const now = Date.now();
    if(count > 0 && (count > 1 || hasVisibilityChange || now - lastCardProcessingLogAt >= 10000)) {
      logger.log(`カード処理 ${count} 件・非表示 ${hiddenElements.size} 件`);
      lastCardProcessingLogAt = now;
    }
  };
  
  /**
   * 処理待ちのカードを後でまとめて判定するためのタイマーを予約する
   * 
   * 予約済みならタイマーを作り直さないため、DOM 変更が続いても最初の予約時刻に処理できる
   * 待ち時間の間に `collectElement()` で追加されたカードも同じ回で処理する
   */
  const schedule = (): void => {
    if(isRunning && timerId == null) timerId = setTimeout(processCards, cardProcessingDelayMilliseconds);
  };
  
  /** 現在のページの全カードを再判定するよう予約する : 条件更新やトグル変更時に呼び、即時には走査しない */
  const processAll = (): void => {
    needsAllCardsProcessing = true;
    schedule();
  };
  
  /**
   * URL の変化に応じて、探索範囲と非表示チェックボックスの初期値を切り替える
   * 
   * 起動時、ページ遷移イベント、DOM 変更通知から呼ぶ
   * 同じ URL なら何もしないため、追加描画で利用者の ON・OFF を上書きしない
   * URL が変わった場合は前ページの非表示を解除し、新しいページの全件処理を予約する・API は呼ばない
   */
  const onNavigate = (): void => {
    const url = new URL(location.href);
    url.hash = '';
    // URL が同じなら何もしない
    if(currentPageUrl === url.href) return;
    
    // 遷移後の URL を控える
    currentPageUrl = url.href;
    
    blockVideoButtons.clear();
    blockChannelButtons.clear();
    // 非表示にしていた要素を一旦元に戻す
    hiddenElements.forEach((_reason, element) => restoreElement(element));
    pendingElements.clear();
    
    // ページ種別を特定する
    const page = getYouTubePage(url);
    
    rootSelectors = page == null ? '' : youTubeSelectors.roots[page.site][page.type];
    enabledElement.disabled = page == null;
    enabledElement.checked = page != null && page.type !== 'search';
    logger.log(`ページ ${page?.site ?? '対象外'}/${page?.type ?? '対象外'}・非表示 ${enabledElement.checked ? 'ON' : 'OFF'}`);
    
    processAll();
  };
  
  /**
   * 非表示チェックボックスの操作をカードの表示状態に反映するイベント処理
   * 
   * OFF では隠していたカードを即座に復元し、ON・OFF とも全件処理を予約する
   * `processCards()` は実行時点のチェック状態を使うため、予約後に OFF にしても再び隠すことはない
   * OFF のままなら全カードの走査は行うが、`matches()` による非表示条件の照合は行わない
   */
  const onToggle = (): void => {
    logger.log(`非表示切替 ${enabledElement.checked ? 'ON' : 'OFF'}`);
    if(!enabledElement.checked) hiddenElements.forEach((_reason, element) => restoreElement(element));
    processAll();
  };
  
  /**
   * クラス属性から本スクリプトの非表示クラスだけを除いた比較用文字列を作る
   * 
   * 変更前後の結果が等しければ、自分のクラス操作による通知として監視側で無視する
   */
  const withoutHiddenClass = (classAttributeValue: string | null): string => (classAttributeValue ?? '').split((/\s+/)).filter(value => value !== 'ytf-hidden' && value !== '').join(' ');
  
  /** 本スクリプトの UI またはその子孫のノードか否か・テキストノードは親要素から判定し、監視対象から除外する */
  const isOwnNode = (node: Node): boolean => (node instanceof Element ? node : node.parentElement)?.closest('[data-ytf-ui]') != null;
  
  /**
   * ページ内の DOM 変更を受け取り、再判定が必要なカードを処理待ちに加える監視オブジェクト
   * 
   * 追加された要素はその子孫も調べ、文字・属性の変更は所属するカードを調べる
   * 取り除かれた要素は非表示状態を解除する・自身の UI 更新と非表示クラス操作は無視する
   * `start()` で監視を登録し、`stop()` で解除する
   */
  const observer = new MutationObserver(records => {
    // YouTube の遷移イベントより DOM 変更が先に届いた場合にも、現在の URL に探索範囲を合わせる
    onNavigate();
    
    for(const record of records) {
      // 本スクリプトの UI 要素なら無視する
      if(isOwnNode(record.target)) continue;
      
      // 文字列自体の変更通知では対象がテキストノードなので、所属要素を起点にする
      const target = record.target instanceof Element ? record.target : record.target.parentElement;
      if(target == null) continue;
      
      // `class` 属性値の変化で無視して良いモノは無視する
      if(record.type === 'attributes' && record.attributeName === 'class' && withoutHiddenClass(record.oldValue) === withoutHiddenClass(target.getAttribute('class'))) continue;
      
      // 子の追加では追加部分だけを走査する・親の全子孫を毎回走査しない
      if(record.type === 'childList') {
        const changed = [...record.addedNodes, ...record.removedNodes].filter(node => !isOwnNode(node));
        if(changed.length === 0) continue;
        
        for(const node of changed) {
          if(!(node instanceof HTMLElement)) continue;
          
          // 削除されたカードを記録に残さない・再挿入時はその時点の内容で改めて判定する
          if(!node.isConnected) {
            restoreElement(node);
            node.querySelectorAll<HTMLElement>('.ytf-hidden').forEach(restoreElement);
          }
          else {
            collectElement(node, true);
          }
        }
      }
      
      // 領域の表示切替では子孫のカードも対象にし、通常の文字・属性変更では所属カードだけを対象にする
      collectElement(target, record.type === 'attributes' && (record.attributeName === 'hidden' || (rootSelectors !== '' && target.matches(rootSelectors))));
    }
    
    // カードが取り除かれた時はボタンの参照も解放する・自分の UI だけの変更では実行しない
    if(records.some(record => [...record.removedNodes].some(node => !isOwnNode(node)))) {
      blockVideoButtons.removeDisconnected();
      blockChannelButtons.removeDisconnected();
    }
    if(pendingElements.size > 0) schedule();
  });
  
  return {
    updateFilterRules: (filterRules: FilterRules): void => {
      // 正規表現などの準備は条件更新時だけ行い、カードごとの処理では返された判定関数を使う
      matches = createCardMatcher(filterRules, logger);
      processAll();
    },
    start: (): void => {
      isRunning = true;
      (document.head ?? document.documentElement).append(styleElement);
      onNavigate();
      // 本文・リンク・表示状態に関係する変更を受け取る・どのカードを調べるかは監視コールバックで絞る
      observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeOldValue: true,
        attributeFilter: ['href', 'src', 'data-src', 'title', 'aria-label', 'hidden', 'class', 'page-subtype', 'section-identifier']
      });
      window.addEventListener('yt-navigate-finish', onNavigate);
      window.addEventListener('popstate', onNavigate);
      enabledElement.addEventListener('change', onToggle);
      logger.log('カード監視開始');
    },
    stop: (): void => {
      isRunning = false;
      observer.disconnect();
      if(timerId != null) clearTimeout(timerId);
      blockVideoButtons.clear();
      blockChannelButtons.clear();
      pendingElements.clear();
      window.removeEventListener('yt-navigate-finish', onNavigate);
      window.removeEventListener('popstate', onNavigate);
      enabledElement.removeEventListener('change', onToggle);
      hiddenElements.forEach((_reason, element) => restoreElement(element));
      enabledElement.checked = false;
      enabledElement.disabled = true;
      styleElement.remove();
      logger.log('カード監視停止・非表示を解除');
    }
  };
};
