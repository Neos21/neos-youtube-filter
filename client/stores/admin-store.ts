import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** ユーザの認証状態を管理する State */
type AdminState = {
  /** API 認証に使用するトークン・未ログイン時は `null` */
  token: string | null;
  /** LocalStorage からトークンの復元処理が完了したか否か・復元前のトークンが `null` である状態を「未ログイン状態」と誤判定しないために使用する */
  isHydrated: boolean;
  
  /** ログイン成功時にトークンを保存する */
  setToken: (token: string) => void;
  /** ログアウト操作時にトークンを削除する */
  logout: () => void;
  /** 復元処理が完了したか否かを更新する */
  setIsHydrated: () => void;
};

/** トークンを LocalStorage に永続化する認証用 Store */
export const useAdminStore = create<AdminState>()(
  persist(
    set => ({
      token: null,
      isHydrated: false,
      
      setToken: (token): void => { set({ token }); },
      logout: (): void => { set({ token: null }); },
      setIsHydrated: (): void => { set({ isHydrated: true }); }
    }),
    {
      // Store 名
      name: 'admin-store',
      
      // 復元完了状態は画面表示ごとに判定するため、`partialize()` を使って LocalStorage にはトークンだけを保存するようにする
      partialize: state => ({ token: state.token }),
      onRehydrateStorage: (): ((state: AdminState | undefined) => void) => (state: AdminState | undefined): void => state?.setIsHydrated()
    }
  )
);
