# メインスクリプトの起動と設定

`$ npm run build` または `$ npm run build:ytf` で生成する `/ytf.js` は、`eval()` や Tampermonkey の `@require` で評価された時点で自動起動する。関数の明示的な呼び出しや外部からの設定注入は不要。起動時に保存済みの条件を復元し、API から最新の条件を取得する。動画の非表示処理は後続タスクで実装する。


## API とトークン

API のベース URL は `scripts/ytf.ts` 内の `apiUrl` 定数で指定する。

トークンは YouTube 側の LocalStorage の固定キー `ytf:token` から取得する。未保存または空の場合は `window.prompt()` で入力を求め、フィルター条件の取得成功後に保存する。API URL を変更しても保存キーは変わらない。公開スクリプト・ブックマークレット・Tampermonkey のコードにトークンを書く必要はない。

`www.youtube.com` と `m.youtube.com` は保存領域が別になる。保存不可の場合は通知し、そのページでの起動を継続する。次回の読み込み時は再入力が必要になる。


## 呼び出し例

- [ブックマークレット](../../scripts/bookmarklet-example.js) : 既存の Fetch・Trusted Types・Eval による読込例を使用する。登録時は先頭に `javascript:` を付ける。改行を除去する場合は、先に行コメントも除去する
- [Tampermonkey](../../scripts/tampermonkey-example.js) : 新規ユーザースクリプトに貼り付ける。`@require` で本体を読み込むだけで起動する

配信先を変更する場合は、各例のスクリプト URL と本体の API URL を変更する。


## 再実行・再設定

初期化中・起動済みの本体を再評価しても、入力や認証処理を重複して実行しない。入力キャンセル・起動失敗後は、本体の再評価で再試行できる。既存ブックマークレットの Trusted Types ポリシーが再作成できない場合は、ページを再読み込みしてから実行する。

条件取得が 401 の場合、使用したトークンと一致する保存値を削除する。ページを再読み込みして再実行すると入力を求める。通信エラーでは保存値を消さない。

任意にトークンを変更する場合は、YouTube 上で LocalStorage の `ytf:token` を削除し、ページを再読み込みして実行する。

`window.__YTF__.status` は `idle` (入力キャンセル)・`starting` (取得中)・`ready` (条件利用可能)・`error` (条件なしの取得失敗)・`unauthorized` (再認証が必要) のいずれか。通信失敗時も既存条件があれば `ready` とし、失敗理由を `error` に保持する。トークンはこのオブジェクトのプロパティとして公開せず、API の Authorization ヘッダーでのみ送信する。

実機の CSP・Trusted Types・拡張機能設定による動作差は最終導入検証で確認する。模擬環境の確認は、Safari や Tampermonkey 上での動作保証とは区別する。

## フィルター条件の取得とキャッシュ

`GET /api/filter-rules` に固定 Bearer トークンを付けて4種類の条件を取得する。別途ログイン API は呼ばず、この応答で認証結果も確認する。

保存キーは `ytf:filter-rules`。版 `version: 1`・取得日時 `fetchedAt`・取得元 `apiUrl`・条件 `rules` を保存する。API URL が変わった場合、トークンは継続利用するが、異なる取得元の条件キャッシュは利用しない。対応外の版・破損・不正な形式は通知し、API から取得する。

起動時は正常なキャッシュを先にメモリに復元する。取得成功時だけ条件と取得日時を更新し、通信失敗・401・不正な応答では既存条件と保存内容を維持する。初回取得失敗時の `rules` は `null` であり、正常取得した空の4配列とは区別する。保存失敗時もメモリの条件は利用できる。

ホーム・動画ページ・検索結果への `yt-navigate-finish` で再取得する。同時再取得はまとめ、定期ポーリングは行わない。実行環境で構築できない正規表現の個別処理は、後続の照合タスクで扱う。

- `window.__YTF__.rules` : 最後に取得・復元した条件
- `window.__YTF__.fetchedAt` : API から条件を取得した日時
- `window.__YTF__.error` : 取得・保存のエラー、空文字ならなし
- `window.__YTF__.refresh()` : 再取得と失敗後の再試行。401 後はトークンの再入力も可能
- `window.__YTF__.updateRules(rules)` : 登録成功後の条件をメモリとキャッシュに反映する入口。全件取得日時は維持する。再取得中・条件未取得・不正な入力では false を返すため、登録処理からは再取得完了後に呼ぶ

表示・非表示の切替や DOM 監視は、後続タスクでこれらの条件を利用する。


## 動画カードの取得

`window.__YTF__.page` で現在のページを取得できる。`site` は `desktop` または `mobile`、`type` は `home`・`watch`・`search`。対象外のページでは `null` となる。

`window.__YTF__.getCards()` は現在の DOM から通常動画・Shorts のカード情報を返す。画面の表示状態や DOM は変更しない。遅延描画・追加読込後は呼び直すことで、その時点の情報を取得できる。

- `element` : 個別カードの要素
- `thumbnailElement`・`thumbnailUrl` : サムネイルのリンク要素と画像 URL
- `videoId`・`title` : 動画 ID とタイトル
- `channelName`・`handle`・`channelId` : チャンネル名と取得可能な識別子
- `isShort` : Shorts のカードか否か

動画 ID が取得できないカードは結果に含めず、それ以外の取得不能な項目は `null` とする。チャンネル名しかないカードから識別子は推測しない。同じ動画が別の場所に表示されている場合は、それぞれ別カードとして返す。

動画ページでは関連動画欄だけを探索し、Shorts 専用プレイヤー・チャンネルページなどは対象外とする。セレクタ候補は [youtube-selectors.ts](../../scripts/dom/youtube-selectors.ts) にまとめている。

開発者ツールでは次のように抽出内容を確認できる。

```javascript
console.table(window.__YTF__.getCards().map(({ videoId, title, channelName, handle, channelId, isShort }) => ({
  videoId, title, channelName, handle, channelId, isShort
})));
```
