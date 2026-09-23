/* eslint-disable */

// ブックマークレットのサンプル

javascript:(async () => {
  try {
    const policy = trustedTypes.createPolicy('neos21-ytf', { createScript: code => code });
    const response = await fetch('https://ytf.neos21.workers.dev/ytf.js');
    const code = await response.text();
    eval(policy.createScript(code));
  }
  catch(error) {
    console.error('スクリプト読み込みに失敗しました', error);
    alert(`スクリプト読み込みに失敗しました : ${error}`);
  }
})();
