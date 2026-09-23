/** 非表示・ログ切替と再取得の操作欄・ページ判定や状態の保持は呼び出し側が担当する */
export const createFilterControls = (onChangeEnabled: (enabled: boolean) => void, onChangeDebug: (enabled: boolean) => void, onRefresh: () => void): {
  render: (enabled: boolean, debug: boolean, supported: boolean) => void;
  destroy: () => void;
} => {
  const container = document.createElement('div');
  container.dataset.ytfUi = 'controls';
  container.id = 'ytf-controls';
  container.style.cssText = 'position:fixed;right:8px;top:8px;z-index:2147483647;display:flex;gap:10px;align-items:center;background:#fff;color:#111;border:1px solid #888;border-radius:4px;padding:6px;font:13px sans-serif;';  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  
  /** タッチで文字部分を押しても切り替えられるラベルを生成する */
  const createCheckbox = (text: string, onChange: (enabled: boolean) => void): HTMLInputElement => {
    const label = document.createElement('label');
    label.style.cssText = 'display:flex;align-items:center;gap:4px;cursor:pointer;';   
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.addEventListener('change', () => onChange(checkbox.checked));
    label.append(checkbox, text);
    container.append(label);
    return checkbox;
  };
  const enabledCheckbox = createCheckbox('非表示', onChangeEnabled);
  const debugCheckbox = createCheckbox('ログ', onChangeDebug);
  const refreshButton = document.createElement('button');
  refreshButton.type = 'button';
  refreshButton.textContent = '再取得';
  refreshButton.style.cssText = 'font:inherit;color:inherit;background:#eee;border:1px solid #888;padding:2px 4px;cursor:pointer;';  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  refreshButton.addEventListener('click', onRefresh);
  container.append(refreshButton);
  
  return {
    render: (enabled: boolean, debug: boolean, supported: boolean): void => {
      if(!container.isConnected) (document.body ?? document.documentElement).append(container);
      enabledCheckbox.checked = enabled;
      enabledCheckbox.disabled = !supported;
      debugCheckbox.checked = debug;
    },
    destroy: (): void => container.remove()
  };
};
