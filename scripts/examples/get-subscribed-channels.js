/* eslint-disable */

// 購読済チャンネル一覧を取得する

// `https://www.youtube.com/feed/channels` を開いて、開発者ツールで以下を実行し、登録チャンネル一覧を最下部までスクロールする
const channels = new Map();
new MutationObserver(_ => {
  document.querySelectorAll('ytd-channel-renderer').forEach(channelElement => {
    const name = channelElement.querySelector('ytd-channel-name yt-formatted-string')?.textContent?.trim() ?? '';
    const url  = decodeURIComponent(channelElement.querySelector('a#main-link')?.href ?? '').replace('https://www.youtube.com/', '').replace('/videos', '');
    if(name !== '' && url !== '') channels.set(name, url);
  });
  console.log(`取得件数 : ${channels.size}`);
}).observe(document.documentElement, { subtree: true, childList: true });

// 全件確認ができたら、以下を実行して JSON 文字列を取得する
copy(JSON.stringify(Object.fromEntries(channels), null, 2));

// 取得した JSON 文字列を、適宜次のような SQL 文に置換する : `INSERT INTO subscribed_channels (title, handle, channel_id) VALUES (NULL, NULL, NULL);`
