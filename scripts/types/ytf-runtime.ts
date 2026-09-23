export {};

declare global {
  interface Window {
    /** メインスクリプトの起動済みフラグ・入力キャンセルや認証失敗後も残し、ページ再読み込みまで重複起動を防ぐ */
    __YTF__?: true;
  }
}
