import { baseUrl, maxLogMessageLength, maxLogMessages, versionText } from '../constants';

/** ロガー関数 : API やカード処理にはメニュー要素ではなくこの型で渡す */
export type Logger = {
  /** 処理経過をコンソールと画面用の履歴に出力する */
  log  : (message: string) => void;
  /** エラーを出力し、メニュー内の通知と見出しの警告表示も更新する */
  error: (message: string) => void;
};

/**
 * 非表示チェックボックス、再取得ボタン、エラー通知、ログ欄を持つ開閉メニューを作る
 * 
 * 返す `menuElement` はまだページに挿入されていないため、起動側で `document.body.append()` する
 * 非表示切替のイベントはページフィルターが、再取得ボタンのイベントは起動側が登録する
 * ログ関数は挿入前にも使用でき、起動中のログとエラー通知もメニューに保持される
 */
export const createMenu = (): Logger & {
  /** 操作メニュー全体の `details` 要素・ページへの挿入対象 */
  menuElement: HTMLDetailsElement;
  /** 非表示 ON・OFF の入力要素・チェック状態がカード判定の有効・無効を表す */
  enabledElement: HTMLInputElement;
  /** 明示的な条件再取得を開始するボタン・通信中と認証失敗後は起動側が無効にする */
  reloadButtonElement: HTMLButtonElement;
  /** 画面通知と見出しの警告表示を消す・ログ履歴は消さない */
  clearError: () => void;
} => {
  /** メニューのルート要素・`data-ytf-ui` を目印にカード監視から除外する */
  const menuElement = document.createElement('details');
  menuElement.id = 'ytf-menu';
  menuElement.dataset.ytfUi = 'menu';
  /* eslint-disable neos-eslint-plugin/comment-colon-spacing */
  menuElement.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    z-index: 999999999;
    max-width: calc(100vw - 2rem);
    border: 1px solid #888;
    padding: .25rem;
    color: #111;
    font-size: 13px;
    background: #fff;
  `;  // iPhone で 1rem が相当小さいのでピクセルでフォントサイズ指定する
  
  /** メニューが閉じていても見える見出し・エラー時には警告の印を付ける */
  const summaryElement = document.createElement('summary');
  summaryElement.style.cursor = 'pointer';
  
  const summaryTitleElement = document.createElement('span');
  summaryTitleElement.textContent = 'YTF';
  summaryTitleElement.style.fontWeight = 'bold';
  
  /** チェックボックスと再取得ボタンを横並びに配置する領域 */
  const actionsElement = document.createElement('div');
  actionsElement.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: .75rem;
    padding: .25rem 0;
  `;
  
  summaryElement.append(summaryTitleElement, actionsElement);
  
  /** 直近のエラーメッセージを表示する領域・通常ログはここには出さない */
  const noticeElement = document.createElement('div');
  noticeElement.style.color = '#c00';
  
  /** ログ履歴を選択・コピーするための読み取り専用欄 */
  const debugLogTextareaElement = document.createElement('textarea');
  debugLogTextareaElement.id = 'ytf-debug-log';
  debugLogTextareaElement.readOnly = true;
  debugLogTextareaElement.title = debugLogTextareaElement.placeholder = 'YTF デバッグログ';
  debugLogTextareaElement.style.cssText = `
    display: block;
    width: min(300px, calc(100vw - 2rem));
    height: 10vh;
    box-sizing: border-box;
    white-space: pre;
  `;
  
  /** 本スクリプト自体の最新版が読み込めているか確認できるようにするための適当な文字列 */
  const versionElement = document.createElement('a');
  versionElement.href = baseUrl;
  versionElement.target = '_blank';
  versionElement.textContent = versionText;
  versionElement.style.cssText = `
    display: block;
    padding: .25rem;
    color: #888;
    text-decoration: none;
  `;
  
  menuElement.append(summaryElement, noticeElement, debugLogTextareaElement, versionElement);
  
  /** 操作領域にラベル付きチェックボックスを追加し要素を返す・文字部分のタッチでも切り替えられる */
  const appendCheckbox = (text: string): HTMLInputElement => {
    const labelElement = document.createElement('label');
    const checkboxElement = document.createElement('input');
    checkboxElement.type = 'checkbox';
    labelElement.style.cursor = 'pointer';
    labelElement.append(checkboxElement, text);
    actionsElement.append(labelElement);
    return checkboxElement;
  };
  
  /** 非表示機能の入力要素・ページごとの初期値はページフィルターが設定する */
  const enabledElement = appendCheckbox('非表示');
  
  /** 条件の全件再取得を要求するボタン・クリック時の通信処理は起動側で接続する */
  const reloadButtonElement = document.createElement('button');
  reloadButtonElement.type = 'button';
  reloadButtonElement.textContent = '再取得';
  reloadButtonElement.style.cssText = `
    border: 1px solid #111;
    padding: .25rem;
    color: #111;
    font-size: inherit;
    background: #fff;
    cursor: pointer;
  `;
  
  actionsElement.append(reloadButtonElement);
  
  /** 日時とレベル付きのログ行を保持する配列・古い順に並び、保持上限を超えた行は先頭から削除する */
  const debugLogMessages: Array<string> = [];
  
  /** 保持しているログ履歴をテキストエリアに書き出し、スクロール位置を末尾に合わせる */
  const renderLog = (): void => {
    debugLogTextareaElement.value = debugLogMessages.join('\n');
    debugLogTextareaElement.scrollTop = debugLogTextareaElement.scrollHeight;
  };
  
  /**
   * メッセージに日時とレベルを付け、コンソール・履歴・ログ欄に同じ内容を出力する
   * 
   * `error` の場合は履歴とは別に画面通知と見出しも更新する
   * 返却する `log()`・`error()` の共通処理として呼ぶ
   */
  const outputLog = (level: 'log' | 'error', message: string): void => {
    const line = `[${new Date().toISOString()} ${level}] ${message.slice(0, maxLogMessageLength)}`;
    console[level](line);
    debugLogMessages.push(line);
    if(debugLogMessages.length > maxLogMessages) debugLogMessages.shift();
    if(level === 'error') {
      noticeElement.textContent = message.slice(0, maxLogMessageLength);
      summaryTitleElement.textContent = 'YTF !';
    }
    renderLog();
  };
  
  renderLog();
  
  return {
    menuElement,
    enabledElement,
    reloadButtonElement,
    log  : (message: string): void => outputLog('log'  , message),
    error: (message: string): void => outputLog('error', message),
    clearError: (): void => {
      noticeElement.textContent = '';
      summaryTitleElement.textContent = 'YTF';
    }
  };
};
