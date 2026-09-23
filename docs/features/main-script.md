# メインスクリプトの起動と設定

`$ npm run build` または `$ npm run build:ytf` で生成する `/ytf.js` は、`eval()` や Tampermonkey の `@require` で評価された時点で自動起動する。関数の明示的な呼び出しや外部からの設定注入は不要。起動時に保存済みの条件を復元し、API から最新の条件を取得する。取得した条件で動画カードの非表示・復元を行う。


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

保存キーは `ytf:filter-rules`。取得日時 `fetchedAt` と条件 `rules` のみを保存し、`version`・`apiUrl` は記録しない。旧形式に含まれる追加項目は読み飛ばし、次回保存時に取り除く。API URL を変更してもキャッシュは継続利用する。破損・不正な形式は通知し、API から取得する。

起動時は正常なキャッシュを先にメモリに復元する。取得成功時だけ条件と取得日時を更新し、通信失敗・401・不正な応答では既存条件と保存内容を維持する。初回取得失敗時の `filterRules` は `null` であり、正常取得した空の4配列とは区別する。保存失敗時もメモリの条件は利用できる。

対象ページへの URL 変更時に再取得する。同時再取得はまとめ、同じ URL の描画通知やハッシュだけの変更では再取得しない。定期ポーリングは行わない。

- `window.__YTF__.filterRules` : 最後に取得・復元した条件
- `window.__YTF__.fetchedAt` : API から条件を取得した日時
- `window.__YTF__.error` : 取得・保存のエラー、空文字ならなし
- `window.__YTF__.refresh()` : 再取得と失敗後の再試行。401 後はトークンの再入力も可能
- `window.__YTF__.updateFilterRules(filterRules)` : 登録成功後の条件をメモリとキャッシュに反映する入口。全件取得日時は維持する。再取得中・条件未取得・不正な入力では `false` を返すため、登録処理からは再取得完了後に呼ぶ

取得・復元・更新した条件は非表示処理にも反映する。


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


## 非表示の切替とページ移動

右上の「非表示」で有効・無効を切り替える。ホーム・動画ページへの移動時は ON、検索結果への移動時は OFF となり、同じ URL の追加読込では手動の切替状態を保持する。「再取得」は条件取得の再試行にも使用できる。

動画 ID、非表示・購読チャンネルの識別子、動画名またはチャンネル名のパターンのいずれかに一致するカードを隠す。文字列は大文字小文字を区別しない部分一致、正規表現は保存済みのフラグで評価する。ブラウザで構築できない正規表現はログにエラーを出力し、その条件だけを除外する。

非表示には `.ytf-hidden` クラスを使用し、既存の `style` 属性は変更しない。OFF、条件変更、カードの再利用、対象外ページへの移動では、一致しなくなったカードを復元する。対象外ページでは操作欄の「非表示」を無効にする。

`yt-navigate-finish`・`popstate` と DOM 監視でページ移動や追加描画を検知する。短時間の更新をまとめて処理し、自身の UI・非表示クラスによる更新は再処理の対象にしない。

- `window.__YTF__.enabled` : 現在の非表示機能の有効状態
- `window.__YTF__.setEnabled(boolean)` : 非表示機能の切替
- `window.__YTF__.destroy()` : 監視・操作欄・ログ表示を解除し、隠したカードを復元する。本体の再評価で起動し直せる


## デバッグログ

処理内容とエラー詳細を `console.log`・`console.error` に出力する。右上の「ログ」を ON にすると、画面左下の読み取り専用テキストエリアにも同じ内容を表示する。画面から選択・コピーでき、開発者ツールは不要。

画面に保持するログは直近200件、1件あたり最大2000文字。OFF にしてもコンソール出力と履歴の保持は続ける。対象は本スクリプトのログのみであり、YouTube や他の拡張機能のコンソール出力は捕捉しない。

ON/OFF は LocalStorage の `ytf:debug` に保存する。保存不可でも現在のページでは切替可能。API のトークン・Authorization ヘッダー・送信本文はログに出力しない。

- `window.__YTF__.debug` : デバッグ表示の有効状態
- `window.__YTF__.setDebug(true)` / `setDebug(false)` : デバッグ表示の切替

実機の YouTube 画面、Safari、Tampermonkey での結合確認は未実施。
