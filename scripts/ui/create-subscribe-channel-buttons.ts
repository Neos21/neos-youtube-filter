import { getChannelRegistration } from '../dom/get-channel-registration';

import type { Logger } from './create-menu';
import type { Result } from '../../shared/types/utilities/result';
import type { ChannelRegistration } from '../dom/get-channel-registration';

/**
 * 各動画カードのサムネイルに購読済みチャンネルの登録ボタンを配置する操作を作る
 * 
 * カードの探索と表示状態の判定はページフィルターに任せる
 * クリック時に識別子を読み直し、YouTube がカードを再利用した場合にも古いチャンネルを送信しない
 * 
 * @param registerSubscribedChannel 購読チャンネルを PUT し、成功時に判定条件を更新する処理
 * @param logger ボタンの配置・解除と登録失敗を記録するログ機能
 */
export const createSubscribeChannelButtons = (registerSubscribedChannel: (channel: ChannelRegistration) => Promise<Result<string>>, logger: Logger): {
  /** 取得済みのチャンネル情報でボタンを配置・更新する・`null` の場合は取り除く */
  update: (cardElement: HTMLElement, registration: ReturnType<typeof getChannelRegistration>) => void;
  /** DOM から取り除かれたカードの参照を解放する */
  removeDisconnected: () => void;
  /** ページ移動と監視停止時にすべてのボタンを取り除く */
  clear: () => void;
} => {
  /** カードと配置済みボタンの対応表・同じカードへの重複配置を防ぐ */
  const subscribeChannelButtons = new Map<HTMLElement, HTMLButtonElement>();
  
  /** 1枚のカードのボタンを取り除き、対応表からも外す */
  const remove = (cardElement: HTMLElement): void => {
    const buttonElement = subscribeChannelButtons.get(cardElement);
    if(buttonElement == null) return;
    buttonElement.remove();
    subscribeChannelButtons.delete(cardElement);
    logger.log('購読済み登録ボタン解除');
  };
  
  return {
    update: (cardElement: HTMLElement, registration: ReturnType<typeof getChannelRegistration>): void => {
      if(registration == null) {
        remove(cardElement);
        return;
      }
      
      const existingButtonElement = subscribeChannelButtons.get(cardElement);
      if(existingButtonElement?.parentElement === registration.thumbnailElement) return;
      remove(cardElement);
      
      /** サムネイル右下に常時表示する購読済みチャンネルの登録ボタン */
      const buttonElement = document.createElement('button');
      buttonElement.type = 'button';
      buttonElement.dataset.ytfUi = 'subscribe-button';
      buttonElement.textContent = '購読済み';
      
      // サムネイルのリンクを開かず、クリックとタッチをこのボタンだけで処理する
      for(const eventName of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'keydown', 'keyup', 'dblclick']) {
        buttonElement.addEventListener(eventName, event => event.stopPropagation());
      }
      
      buttonElement.addEventListener('click', async (event): Promise<void> => {
        event.preventDefault();
        event.stopPropagation();
        if(buttonElement.disabled) return;
        
        const currentRegistration = getChannelRegistration(cardElement);
        if(currentRegistration == null) {
          logger.error('購読済み登録中止 : チャンネル識別子またはサムネイルを取得できません');
          remove(cardElement);
          return;
        }
        
        buttonElement.disabled = true;
        buttonElement.textContent = '登録中…';
        const result = await registerSubscribedChannel(currentRegistration.channel);
        if(result.error != null) logger.error(result.error);
        
        // OFF 中または通信失敗時にも、同じカードから再操作できる状態に戻す
        buttonElement.disabled = false;
        buttonElement.textContent = '購読済み';
      });
      
      subscribeChannelButtons.set(cardElement, buttonElement);
      registration.thumbnailElement.append(buttonElement);
      logger.log(`購読済み登録ボタン配置 : ${registration.channel.handle ?? registration.channel.channel_id}`);
    },
    removeDisconnected: (): void => subscribeChannelButtons.forEach((_buttonElement, element) => { if(!element.isConnected) remove(element); }),
    clear: (): void => subscribeChannelButtons.forEach((_buttonElement, cardElement) => remove(cardElement))
  };
};
