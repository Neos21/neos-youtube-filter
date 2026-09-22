import { type ChangeEvent, type ReactElement, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';

import { authenticationRedirectReasonLogout, sessionStorageKeyAuthenticationRedirectReason } from '../constants/client-constants';
import { useAdminStore } from '../stores/admin-store';

/** ログイン後の全画面共通のレイアウト */
export default function AdminLayout(): ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);  // スマホ表示時のサイドメニュー開閉状態
  
  /** サイドメニューに表示する管理ページのリンク */
  const menuItems = [
    { to: '/home', label: 'ホーム' }
  ];
  
  /** サイドメニューを開閉する */
  const onChangeSidebar = (event: ChangeEvent<HTMLInputElement>): void => setIsSidebarOpen(event.target.checked);
  /** サイドメニューのリンクを押下した時にサイドメニューを閉じるためのイベント */
  const onCloseSidebar = (): void => setIsSidebarOpen(false);
  
  /** ユーザ操作によるログアウト理由を記録してから JWT を削除し、トップページに遷移する */
  const onLogout = (): void => {
    if(!window.confirm('ログアウトしますか？')) return;
    
    sessionStorage.setItem(sessionStorageKeyAuthenticationRedirectReason, authenticationRedirectReasonLogout);
    useAdminStore.getState().logout();
    navigate('/', { replace: true });
  };
  
  return (
    <div className="drawer min-h-screen lg:drawer-open">
      {/* サイドメニュー開閉を操作するための非表示チェックボックス */}
      <input id="admin-sidebar" type="checkbox" className="drawer-toggle" checked={isSidebarOpen} onChange={onChangeSidebar} />
      
      <div className="drawer-content">
        {/* スマホサイズ時のみ表示されるハンバーガーメニューとヘッダラベル */}
        <header className="navbar h-10 min-h-10 bg-base-100 p-0 shadow-sm lg:hidden">
          <div className="flex-none">
            <label htmlFor="admin-sidebar" className="btn ml-2 btn-square size-10 min-h-10 btn-ghost">
              <svg xmlns="http://www.w3.org/2000/svg" className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </label>
          </div>
          <Link to="/home" className="ml-2 flex-1 text-lg font-bold">Example</Link>
        </header>
        
        {/* コンテンツ部分 */}
        <div className="min-h-screen px-3 pt-4 pb-12">
          <Outlet />
        </div>
      </div>
      
      <div className="drawer-side">
        {/* スマホサイズでサイドメニューを開いた際に表示されるバックドロップ */}
        <label htmlFor="admin-sidebar" className="drawer-overlay" />
        
        {/* サイドメニュー */}
        <aside className="min-h-full w-72 border-r border-base-300 bg-base-200 px-3 pt-4 pb-8 text-base-content">
          <div className="mb-6 text-xl font-bold">Example</div>
          <nav className="mb-6">
            <ul className="menu w-full gap-2 p-0">
              {menuItems.map(item => {
                const isActive = location.pathname === item.to;
                return (
                  <li key={item.to}>
                    <Link to={item.to} className={isActive ? 'menu-active font-bold' : ''} onClick={onCloseSidebar}>{item.label}</Link>
                  </li>
                );
              })}
              <li className="mt-4"><button type="button" onClick={onLogout}>ログアウト</button></li>
            </ul>
          </nav>
        </aside>
      </div>
    </div>
  );
}
