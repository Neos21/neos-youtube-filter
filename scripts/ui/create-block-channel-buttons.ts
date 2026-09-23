import { getChannelRegistration } from '../dom/get-channel-registration';

import type { Logger } from './create-menu';
import type { Result } from '../../shared/types/utilities/result';
import type { ChannelRegistration } from '../dom/get-channel-registration';

/**
 * ブロックチャンネル登録ボタンをカードごとに配置・解除する操作を作る
 * 
 * カードの探索は行わず、ページフィルターが処理するカードを `update()` で受け取る
 * 登録内容はクリック時に読み直すため、YouTube がカードを別チャンネルに再利用しても古い ID を送信しない
 * 
 * @param registerChannel チャンネルを PUT し、成功時に条件とキャッシュを更新する処理
 * @param logger ボタン配置・解除・登録失敗を記録するログ機能
 */
export const createBlockChannelButtons = (registerChannel: (channel: ChannelRegistration) => Promise<Result<string>>, logger: Logger): {
  /** 対象カードのボタンを配置・更新する・対象外や削除されたカードのボタンは取り除く */
  update: (cardElement: HTMLElement, isEligible: boolean) => void;
  /** DOM から削除されたカードのボタンを解放する・DOM の削除通知をまとめて受け取った時に呼ぶ */
  removeDisconnected: () => void;
  /** 配置した全ボタンを取り除く・ページ移動と監視停止時に呼ぶ */
  clear: () => void;
} => {
  /** カードと配置済みボタンの対応表・重複配置を避け、ページ移動と停止時にまとめて解除する */
  const blockChannelButtons = new Map<HTMLElement, HTMLButtonElement>();
  
  /** 1枚のカードのボタンを取り除き、管理対象から外す */
  const remove = (cardElement: HTMLElement): void => {
    const buttonElement = blockChannelButtons.get(cardElement);
    if(buttonElement == null) return;
    buttonElement.remove();
    blockChannelButtons.delete(cardElement);
    logger.log('ブロックチャンネル登録ボタン解除');
  };
  
  return {
    update: (cardElement: HTMLElement, isEligible: boolean): void => {
      const registration = isEligible ? getChannelRegistration(cardElement) : null;
      if(registration == null) {
        remove(cardElement);
        return;
      }
      
      const existingButtonElement = blockChannelButtons.get(cardElement);
      if(existingButtonElement?.parentElement === registration.thumbnailElement) return;
      remove(cardElement);
      
      /** サムネイルに常時表示する登録ボタン・タッチ端末でもホバーせず操作できる */
      const buttonElement = document.createElement('button');
      buttonElement.type = 'button';
      buttonElement.dataset.ytfUi = 'channel-button';
      buttonElement.textContent = 'このチャンネルを非表示にする';
      
      // YouTube のサムネイル操作に伝播させず、クリックの既定動作によるリンク遷移も止める
      for(const eventName of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'keydown', 'keyup', 'dblclick']) {
        buttonElement.addEventListener(eventName, event => event.stopPropagation());
      }
      
      buttonElement.addEventListener('click', async (event): Promise<void> => {
        event.preventDefault();
        event.stopPropagation();
        if(buttonElement.disabled) return;
        
        const currentRegistration = getChannelRegistration(cardElement);
        if(currentRegistration == null) {
          logger.error('ブロックチャンネル登録中止 : チャンネル識別子またはサムネイルを取得できません');
          remove(cardElement);
          return;
        }
        
        buttonElement.disabled = true;
        buttonElement.textContent = '登録中…';
        const result = await registerChannel(currentRegistration.channel);
        if(result.error != null) logger.error(result.error);
        
        // 成功後も OFF 中は表示を維持する・失敗時も同じボタンから再操作できる
        buttonElement.disabled = false;
        buttonElement.textContent = 'このチャンネルを非表示にする';
      });
      
      blockChannelButtons.set(cardElement, buttonElement);
      registration.thumbnailElement.append(buttonElement);
      logger.log(`ブロックチャンネル登録ボタン配置 : ${registration.channel.handle ?? registration.channel.channel_id}`);
    },
    removeDisconnected: (): void => blockChannelButtons.forEach((_buttonElement, element) => { if(!element.isConnected) remove(element); }),
    clear: (): void => blockChannelButtons.forEach((_buttonElement, cardElement) => remove(cardElement))
  };
};
