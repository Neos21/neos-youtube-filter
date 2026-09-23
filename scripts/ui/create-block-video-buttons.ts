import { getVideoRegistration } from '../dom/get-video-registration';

import type { Logger } from './create-menu';
import type { Result } from '../../shared/types/utilities/result';
import type { VideoRegistration } from '../dom/get-video-registration';

/**
 * ブロック動画登録ボタンをカードごとに配置・解除する操作を作る
 * 
 * カードの探索は行わず、ページフィルターが処理するカードを `update()` で受け取る
 * 登録内容はクリック時に読み直すため、YouTube がカードを別動画に再利用しても古い ID を送信しない
 * 
 * @param registerVideo 動画を PUT し、成功時に条件とキャッシュを更新する処理
 * @param logger ボタン配置・解除・登録失敗を記録するログ機能
 */
export const createBlockVideoButtons = (registerVideo: (video: VideoRegistration) => Promise<Result<string>>, logger: Logger): {
  /** 対象カードのボタンを配置・更新する・対象外や削除されたカードのボタンは取り除く */
  update: (cardElement: HTMLElement, isEligible: boolean) => void;
  /** DOM から削除されたカードのボタンを解放する・DOM の削除通知をまとめて受け取った時に呼ぶ */
  removeDisconnected: () => void;
  /** 配置した全ボタンを取り除く・ページ移動と監視停止時に呼ぶ */
  clear: () => void;
} => {
  /** カードと配置済みボタンの対応表・重複配置を避け、ページ移動と停止時にまとめて解除する */
  const blockVideoButtons = new Map<HTMLElement, HTMLButtonElement>();
  
  /** 1枚のカードのボタンを取り除き、管理対象から外す */
  const remove = (cardElement: HTMLElement): void => {
    const buttonElement = blockVideoButtons.get(cardElement);
    if(buttonElement == null) return;
    buttonElement.remove();
    blockVideoButtons.delete(cardElement);
    logger.log('ブロック動画登録ボタン解除');
  };
  
  return {
    update: (cardElement: HTMLElement, isEligible: boolean): void => {
      const registration = isEligible ? getVideoRegistration(cardElement) : null;
      if(registration == null) {
        remove(cardElement);
        return;
      }
      
      const existingButtonElement = blockVideoButtons.get(cardElement);
      if(existingButtonElement?.parentElement === registration.thumbnailElement) return;
      remove(cardElement);
      
      /** サムネイルに常時表示する登録ボタン・タッチ端末でもホバーせず操作できる */
      const buttonElement = document.createElement('button');
      buttonElement.type = 'button';
      buttonElement.dataset.ytfUi = 'video-button';
      buttonElement.textContent = 'この動画を非表示にする';
      
      // YouTube のサムネイル操作に伝播させず、クリックの既定動作によるリンク遷移も止める
      for(const eventName of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'keydown', 'keyup', 'dblclick']) {
        buttonElement.addEventListener(eventName, event => event.stopPropagation());
      }
      buttonElement.addEventListener('click', async (event): Promise<void> => {
        event.preventDefault();
        event.stopPropagation();
        if(buttonElement.disabled) return;
        const currentRegistration = getVideoRegistration(cardElement);
        if(currentRegistration == null) {
          logger.error('ブロック動画登録中止 : 動画 ID またはサムネイルを取得できません');
          remove(cardElement);
          return;
        }
        buttonElement.disabled = true;
        buttonElement.textContent = '登録中…';
        const result = await registerVideo(currentRegistration.video);
        if(result.error != null) logger.error(result.error);
        // 成功後も OFF 中は表示を維持する・失敗時も同じボタンから再操作できる
        buttonElement.disabled = false;
        buttonElement.textContent = 'この動画を非表示にする';
      });
      blockVideoButtons.set(cardElement, buttonElement);
      registration.thumbnailElement.append(buttonElement);
      logger.log(`ブロック動画登録ボタン配置 : ${registration.video.video_id}`);
    },
    removeDisconnected: (): void => blockVideoButtons.forEach((_buttonElement, element) => { if(!element.isConnected) remove(element); }),
    clear: (): void => blockVideoButtons.forEach((_buttonElement, cardElement) => remove(cardElement))
  };
};
