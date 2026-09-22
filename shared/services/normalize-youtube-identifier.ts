/**
 * YouTube URL または直接入力された識別子を保存用の文字列に整形する
 * 
 * 識別子の桁数や文字種の検証は呼び出し側の Schema が担当する
 * 
 * @param value 入力値
 *              文字列以外は変換せず返す
 *              文字列は前後の空白を除去して解釈し、`http`・`https` から始まる場合だけ URL として扱う
 *              スキームなしの URL や相対 URL は URL として解釈しない
 * 
 * @param kind 抽出する識別子の種別
 *             `video` は動画 ID の直接入力、`youtu.be` の単一パス、YouTube の `/watch?v=`・`/shorts/`・`/embed/`・`/live/` に対応する
 *             `channel` はチャンネル ID の直接入力、YouTube の `/channel/【チャンネル ID】` に対応する
 *             `handle` は `@` の有無を問わないハンドルの直接入力、YouTube の `/@ハンドル` に対応する
 *             YouTube URL の許可ホストは `youtube.com`・`www.youtube.com`・`m.youtube.com` で、`youtu.be` は動画の短縮 URL にのみ対応する
 * 
 * @returns 文字列以外は入力値そのものを返すため、`null`・`undefined`・数値などもそのまま返る
 *          対応する動画 URL・チャンネル URL は抽出した ID を返し、大小文字を保持する
 *          `/watch` に `v` クエリ文字列がない場合、または `v` が空の場合は空文字を返し、Schema 側で必須エラーとする
 *          ハンドル URL はパスをデコードした後、先頭に `@` を1つ補い、小文字化した文字列を返す
 *          直接入力した文字列は Trim した値を返し、Handle の空でない入力に限り `@` の補完と小文字化を行う
 *          空文字・空白だけの文字列は空文字を返す
 *          許可外ホスト・種別と一致しない URL パス・URL 解析失敗・デコード失敗では、Trim 前の元の入力値を返す
 *          元の入力値を返すケースも成功を意味せず、呼び出し側の Schema で不正な識別子として拒否する
 */
export const normalizeYouTubeIdentifier = (value: unknown, kind: 'video' | 'channel' | 'handle'): unknown => {
  // Zod の Preprocessor として受け、型の不一致は後続の Schema に判定させる
  if(typeof value !== 'string') return value;
  
  let normalized = value.trim();
  if((/^https?:\/\//i).test(normalized)) {
    try {
      const url = new URL(normalized);
      const host = url.hostname.toLowerCase();
      if(!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(host)) return value;
      
      // 先頭・末尾のスラッシュによる空要素を除き、パスの種類と要素数を照合する
      const parts = url.pathname.split('/').filter(part => part.length > 0);
      
      // 動画 ID は URL の形式に応じてパスまたは `v` パラメータから取得する
      if(kind === 'video') {
        if(host === 'youtu.be' && parts.length === 1) normalized = parts[0];
        else if(host !== 'youtu.be' && url.pathname === '/watch') normalized = url.searchParams.get('v') ?? '';
        else if(host !== 'youtu.be' && parts.length === 2 && ['shorts', 'embed', 'live'].includes(parts[0])) normalized = parts[1];
        else return value;
      }
      // チャンネル ID とハンドルは別種として扱い、相互の推測や名前からの変換はしない
      else if(host !== 'youtu.be' && kind === 'channel' && parts.length === 2 && parts[0] === 'channel') normalized = parts[1];
      else if(host !== 'youtu.be' && kind === 'handle' && parts.length === 1 && parts[0].startsWith('@')) normalized = decodeURIComponent(parts[0]);
      else return value;
    }
    catch {
      // 壊れた URL やパーセントエンコードも例外を外に投げず、入力検証に渡す
      return value;
    }
  }
  
  // ハンドルだけを比較用に小文字化し、動画 ID・チャンネル ID の大小文字は維持する
  if(kind === 'handle' && normalized.length > 0) return `@${normalized.replace((/^@/), '').toLowerCase()}`;
  
  return normalized;
};
