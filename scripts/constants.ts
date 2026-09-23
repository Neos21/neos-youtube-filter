/** メインスクリプトから呼び出す API のベース URL・各エンドポイントのパスを末尾に連結する */
export const apiBaseUrl = 'https://ytf.neos21.workers.dev/api';

/** Bearer トークンを保存する LocalStorage のキー・API の接続先を変えても同じキーを使う */
export const tokenStorageKey = 'ytf:token';

/** 判定用のフィルター条件を JSON 文字列で保存する LocalStorage のキー */
export const filterRulesStorageKey = 'ytf:filter-rules';

/** API の通信開始から応答本文の読込まで待つ最大時間・単位はミリ秒 */
export const apiTimeoutMilliseconds = 15000;

/** DOM 変更を検知してからカードをまとめて処理するまでの待ち時間・単位はミリ秒 */
export const cardProcessingDelayMilliseconds = 100;

/** 画面表示用に保持するログの最大件数・上限を超えたら古い行から捨てる */
export const maxLogMessages = 200;

/** ログ1件のメッセージ本文と画面通知の最大文字数・日時とレベルの接頭辞は含まない */
export const maxLogMessageLength = 2000;

/** 本スクリプト自体の最新版が読み込めているか確認できるようにするための適当な文字列 */
export const versionText = 'Version : 2029-06-23 18 : 04 : 52';
