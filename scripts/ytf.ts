import { tokenStorageKey } from './constants';
import { createPageFilter } from './filter/create-page-filter';
import { readFilterRules, saveFilterRules } from './helpers/filter-rules';
import { createApiClient } from './helpers/request-api';
import { readStorage, removeStorage, writeStorage } from './helpers/storage';
import { apiFilterRulesSchema } from './schemas/filter-rules-schema';
import { createMenu } from './ui/create-menu';

import type { VideoRegistration } from './dom/get-video-registration';
import type { FilterRules } from './schemas/filter-rules-schema';
import type { Result } from '../shared/types/utilities/result';

/** メインスクリプトの起動処理・トークンと条件を読み込み、操作メニューを配置してカード監視を開始する */
(async (): Promise<void> => {
  // 対象サイトと重複起動を確認する・停止後も再読み込みまでは起動し直さない
  if(!location.hostname.includes('youtube.com') || window.top !== window.self || window.__YTF__ != null) return;
  // 重複起動を回避するフラグを立てる
  window.__YTF__ = true;
  // ページ読み込みまで待機する
  if(document.readyState === 'loading') await new Promise<void>(resolve => document.addEventListener('DOMContentLoaded', () => resolve(), { once: true }));
  
  /** 操作メニューとログ機能・画面に配置する前から起動中のログを保持できる */
  const menu = createMenu();
  menu.log('起動・トークン読込');
  
  // トークンを LocalStorage から取得する・取得できなければ入力を求める
  const storedTokenResult = readStorage(tokenStorageKey);
  if(storedTokenResult.error != null) menu.error(storedTokenResult.error);
  /** 今回の起動中に API 呼び出しで共通利用するトークン・入力キャンセルや空入力なら起動を終了する */
  const token = (storedTokenResult.result?.trim() || window.prompt('Neo\'s YouTube Filter のトークンを入力してください') || '').trim();
  if(token === '') return menu.log('入力キャンセル・終了');
  // トークンを保存し直す
  const savedTokenResult = writeStorage(tokenStorageKey, token);
  if(savedTokenResult.error != null) menu.error(savedTokenResult.error);
  
  /** 現在の判定用条件・全件取得と動画登録の成功結果をここに反映してから保存する */
  let currentFilterRules: FilterRules = { blocked_videos: [], blocked_channels: [], blocked_patterns: [], subscribed_channels: [] };
  
  /** 認証失敗により終了したか否か・初回の監視開始を防ぎ、再取得ボタンを無効のままにする */
  let isStopped = false;
  
  /** API 呼び出し関数を作る・認証失敗時の終了処理もここで登録する */
  const requestApi = createApiClient(token, menu, (): void => {
    // `401` を受けた後は入力を求め直さず停止し、次のページ読込で再入力できるよう保存トークンを消す
    isStopped = true;
    pageFilter.stop();
    menu.reloadButtonElement.disabled = true;
    const removedResult = removeStorage(tokenStorageKey);
    if(removedResult.error != null) menu.error(removedResult.error);
  });
  
  /**
   * 動画を登録し、保存結果の ID を判定用条件とキャッシュに追加する
   * 
   * PUT の成功後も全件取得はせず、同じ動画を含む全カードを現在の ON・OFF に従って再判定する
   * 再取得または別の登録の通信中は新たな送信を受け付けず、応答順による条件の上書きを避ける
   * 
   * @returns 成功時は保存した動画 ID・通信失敗や不正応答では条件を変更せずエラーを返す
   */
  const registerVideo = async (video: VideoRegistration): Promise<Result<string>> => {
    if(isStopped) return { error: '認証失敗により停止中です・ページを再読み込みしてください' };
    if(menu.reloadButtonElement.disabled) return { error: '別の通信が実行中です・完了後にもう一度操作してください' };
    menu.reloadButtonElement.disabled = true;
    menu.clearError();
    menu.log(`動画登録開始 : ${video.video_id}`);
    const response = await requestApi('/blocked-videos', 'PUT', video);
    menu.reloadButtonElement.disabled = isStopped;
    if(response.error != null) return { error: `動画登録失敗 ${video.video_id} : ${response.error}` };
    
    const body = response.result;
    const savedVideo = body != null && typeof body === 'object' && 'result' in body ? body.result : null;
    if(savedVideo == null || typeof savedVideo !== 'object' || !('video_id' in savedVideo) || savedVideo.video_id !== video.video_id) {
      return { error: `動画登録の応答形式が不正です ${video.video_id}・既存の条件を保持します` };
    }
    if(!currentFilterRules.blocked_videos.includes(savedVideo.video_id)) currentFilterRules.blocked_videos.push(savedVideo.video_id);
    saveFilterRules(currentFilterRules, menu);
    pageFilter.updateFilterRules(currentFilterRules);
    menu.log(`動画登録成功 : ${savedVideo.video_id}・非表示 ${menu.enabledElement.checked ? 'ON' : 'OFF'}`);
    return { result: savedVideo.video_id };
  };
  
  /** カードの非表示・復元と DOM 監視を操作するオブジェクト・この時点ではまだ監視を開始しない */
  const pageFilter = createPageFilter(menu.enabledElement, menu, registerVideo);
  
  /**
   * API から全フィルター条件を取得し、キャッシュとカード判定の条件を更新する
   * 
   * 起動時にキャッシュが使えない場合と、利用者が再取得ボタンを押した場合に呼ぶ
   * 取得した JSON を判定用形式に変換してから保存・反映するため、通信や形式確認の失敗では既存条件を維持する
   * 呼び出し中は再取得ボタンを無効にし、認証失敗でなければ終了後に再び有効にする
   */
  const reloadFilterRules = async (): Promise<void> => {
    menu.reloadButtonElement.disabled = true;
    menu.clearError();
    
    const response = await requestApi('/filter-rules');
    if(response.error != null) {
      menu.error(response.error);
    }
    else {
      const body = response.result;
      const parsed = apiFilterRulesSchema.safeParse(body != null && typeof body === 'object' && 'result' in body ? body.result : null);
      if(!parsed.success) {
        menu.error(`API 応答形式が不正です・既存の条件を保持します : ${parsed.error.issues.map(issue => issue.path.join('.')).join(', ')}`);
      }
      else {
        currentFilterRules = parsed.data;
        saveFilterRules(currentFilterRules, menu);
        pageFilter.updateFilterRules(parsed.data);
        menu.log(`条件取得 : 動画 ${parsed.data.blocked_videos.length}・チャンネル ${parsed.data.blocked_channels.length}・パターン ${parsed.data.blocked_patterns.length}・購読 ${parsed.data.subscribed_channels.length}`);
      }
    }
    
    menu.reloadButtonElement.disabled = isStopped;  // `requestApi()` での 401 時も考慮して `isStopped` を使用する
  };
  
  /** 保存済みの判定用条件・このキャッシュがあれば API を呼ばずに利用する・`null` は利用できるキャッシュがないことを表す */
  const cachedFilterRules = readFilterRules(menu);
  if(cachedFilterRules != null) {
    currentFilterRules = cachedFilterRules;
    pageFilter.updateFilterRules(currentFilterRules);
  }
  else {
    await reloadFilterRules();
  }
  
  // 条件の読込後に操作メニューを配置し、カードの処理と監視を開始する
  document.body.append(menu.menuElement);
  menu.reloadButtonElement.addEventListener('click', (): void => { reloadFilterRules(); });
  if(!isStopped) pageFilter.start();
})();
