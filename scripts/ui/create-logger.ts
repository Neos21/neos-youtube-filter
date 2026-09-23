/** メインスクリプトのログ出力・YouTube や他の拡張機能のコンソールは捕捉しない */
export type Logger = {
  readonly debug: boolean;
  log: (message: string) => void;
  error: (message: string) => void;
  setDebug: (enabled: boolean) => void;
  destroy: () => void;
};

/** コンソールと画面に同じ文字列を出力する・直近のログだけを保持する */
export const createLogger = (): Logger => {
  const messages: Array<string> = [];
  const textarea = document.createElement('textarea');
  textarea.dataset.ytfUi = 'log';
  textarea.id = 'ytf-debug-log';
  textarea.readOnly = true;
  textarea.title = 'Neo\'s YouTube Filter デバッグログ';
  textarea.style.cssText = 'position:fixed;left:8px;bottom:8px;width:min(640px,calc(100vw - 16px));height:28vh;z-index:2147483647;box-sizing:border-box;background : #111;color : #eee;border:1px solid #888;padding:8px;font:12px monospace;white-space:pre;resize:both;';   
  let debug = false;
  
  /** 画面表示はログの末尾に追従する・画面を閉じていても履歴は保持する */
  const render = (): void => {
    if(!debug) return;
    if(!textarea.isConnected) (document.body ?? document.documentElement).append(textarea);
    textarea.value = messages.join('\n');
    textarea.scrollTop = textarea.scrollHeight;
  };
  
  /** 長すぎるログを切り詰め、コンソールにも同一内容を出力する */
  const output = (level: 'log' | 'error', message: string): void => {
    const line = `[YTF ${new Date().toISOString()} ${level}] ${message.slice(0, 2000)}`;
    console[level](line);
    messages.push(line);
    if(messages.length > 200) messages.shift();
    render();
  };
  
  return {
    get debug(): boolean { return debug; },
    log: (message: string): void => output('log', message),
    error: (message: string): void => output('error', message),
    setDebug: (enabled: boolean): void => {
      debug = enabled;
      if(!debug) textarea.remove();
      output('log', `デバッグ表示 ${enabled ? 'ON' : 'OFF'}`);
    },
    destroy: (): void => {
      debug = false;
      textarea.remove();
    }
  };
};
