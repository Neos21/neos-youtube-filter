# メインスクリプトの起動と設定

`$ npm run build` または `$ npm run build:ytf` で生成する `/ytf.js` は、`eval()` や Tampermonkey の `@require` で評価された時点で自動起動する。関数の明示的な呼び出しや外部からの設定注入は不要。現在は設定・認証確認までを行い、動画の非表示処理は後続タスクで実装する。


## API とトークン

API のベース URL は `scripts/ytf.ts` 内の `apiUrl` 定数で指定する。

トークンは YouTube 側の LocalStorage の固定キー `ytf:token` から取得する。未保存または空の場合は `window.prompt()` で入力を求め、認証成功後に保存する。API URL を変更しても保存キーは変わらない。公開スクリプト・ブックマークレット・Tampermonkey のコードにトークンを書く必要はない。

`www.youtube.com` と `m.youtube.com` は保存領域が別になる。保存不可の場合は通知し、そのページでの起動を継続する。次回の読み込み時は再入力が必要になる。


## 呼び出し例

- [ブックマークレット](../../scripts/bookmarklet-example.js) : 既存の Fetch・Trusted Types・Eval による読込例を使用する。登録時は先頭に `javascript:` を付ける。改行を除去する場合は、先に行コメントも除去する
- [Tampermonkey](../../scripts/tampermonkey-example.js) : 新規ユーザースクリプトに貼り付ける。`@require` で本体を読み込むだけで起動する

配信先を変更する場合は、各例のスクリプト URL と本体の API URL を変更する。


## 再実行・再設定

初期化中・起動済みの本体を再評価しても、入力や認証処理を重複して実行しない。入力キャンセル・起動失敗後は、本体の再評価で再試行できる。既存ブックマークレットの Trusted Types ポリシーが再作成できない場合は、ページを再読み込みしてから実行する。

認証確認が 401 の場合、使用したトークンと一致する保存値を削除する。ページを再読み込みして再実行すると入力を求める。通信エラーでは保存値を消さない。

任意にトークンを変更する場合は、YouTube 上で LocalStorage の `ytf:token` を削除し、ページを再読み込みして実行する。

`window.__YTF__.status` は `idle`・`starting`・`ready`・`error` のいずれか。`ready` は現段階では認証確認済みを意味する。トークンはこのオブジェクトのプロパティとして公開せず、API の Authorization ヘッダーでのみ送信する。

実機の CSP・Trusted Types・拡張機能設定による動作差は最終導入検証で確認する。模擬環境の確認は、Safari や Tampermonkey 上での動作保証とは区別する。
