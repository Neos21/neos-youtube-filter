/** DOM から取得した動画1件・呼び出し時点の情報であり DOM の再利用後は再取得する */
export type YouTubeCard = {
  /** 非表示クラスを付ける個別カード・棚や再生プレイヤーは含めない */
  element: HTMLElement;
  /** サムネイルのリンク要素・未描画などで取得できない場合は `null` */
  thumbnailElement: HTMLElement | null;
  /** サムネイル URL・遅延読込前など画像 URL を取得できない場合は `null` */
  thumbnailUrl: string | null;
  /** 動画 ID */
  videoId: string;
  /** 動画タイトル・DOM に表示された文字列・取得不能なら `null` */
  title: string | null;
  /** チャンネル名・DOM に表示された文字列・取得不能なら `null` */
  channelName: string | null;
  /** 先頭 `@` 付き小文字ハンドル・表示名からは推測しない */
  handle: string | null;
  /** チャンネル ID・大文字小文字を保持する・リンクがなければ `null` */
  channelId: string | null;
  /** Shorts 用カードまたは Shorts リンクから取得した動画か否か */
  isShort: boolean;
};
