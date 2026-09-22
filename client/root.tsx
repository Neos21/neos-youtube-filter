import { type ReactElement, type ReactNode, useEffect } from 'react';
import { isRouteErrorResponse, Link, Links, Outlet, Scripts, ScrollRestoration, useLocation, useNavigate } from 'react-router';

import { authenticationRedirectReasonLogout, authenticationRedirectReasonReloginRequired, sessionStorageKeyAuthenticationRedirectReason } from './constants/client-constants';
import { useAdminStore } from './stores/admin-store';
import { isEmpty } from '../shared/helpers/is-empty';

// NOTE : `$ npx react-router typegen` で `./.react-router/` 配下に出力される型定義 (開発時は自動的に出力される) を参照するのが `./+types/` という書き方 https://eiji.page/blog/react-router-dynamic-meta/
import type { Route } from './+types/root';

import './styles.css';

/** HTML 文書としてのルートレイアウト */
export function Layout({ children }: { children: ReactNode }): ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  
  const isHydrated = useAdminStore(state => state.isHydrated);
  const token      = useAdminStore(state => state.token);
  
  // JWT の有無でログイン済か否かをチェックし適宜リダイレクトする
  useEffect((): void => {
    if(isHydrated !== true) return;  // LocalStorage から Store の復旧が済んでいない段階では何もしない
    
    const isAuthenticated = !isEmpty(token);
    
    if(isAuthenticated && location.pathname === '/') {  // ログイン済の場合は `/home` に移動する
      navigate('/home', { replace: true });
      return;
    }
    if(!isAuthenticated && location.pathname !== '/') {  // 未ログインの場合に `/` 以外にいる場合は `/` に移動する
      // JWT 有効期限切れ等の理由の場合は `index.tsx` にメッセージを表示するため、必要に応じて SessionStorage に情報を記録してから遷移する
      const redirectReason = sessionStorage.getItem(sessionStorageKeyAuthenticationRedirectReason);
      if(redirectReason !== authenticationRedirectReasonLogout) sessionStorage.setItem(sessionStorageKeyAuthenticationRedirectReason, authenticationRedirectReasonReloginRequired);
      navigate('/', { replace: true });
      return;
    }
  }, [location.pathname, navigate, isHydrated, token]);
  
  return (
    <html lang="ja">
      <head>
        <meta charSet="UTF-8" />
        <title>Neo's YouTube Filter</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
        <meta name="description" content="Neo's YouTube Filter" />
        <meta name="keywords" content="Neo's YouTube Filter" />
        <meta name="robots" content="noindex, nofollow" />
        
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Neo's YouTube Filter" />
        <meta property="og:title" content="Neo's YouTube Filter" />
        <meta property="og:description" content="Neo's YouTube Filter" />
        <meta property="og:url" content="https://ytf.neos21.workers.dev" />
        <meta property="og:image" content="https://ytf.neos21.workers.dev/icon-512.png" />
        <meta property="og:locale" content="ja_JP" />
        
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="Neo's YouTube Filter" />
        <meta property="twitter:description" content="Neo's YouTube Filter" />
        <meta property="twitter:url" content="https://ytf.neos21.workers.dev" />
        <meta property="twitter:image" content="https://ytf.neos21.workers.dev/icon-512.png" />
        
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        
        <Links />
      </head>
      <body>
        {children}
        
        {/* スクロール位置の復元用・`<Scripts />` の直前に置くこと https://react-router-docs-ja.techtalk.jp/api/components/ScrollRestoration */}
        <ScrollRestoration />
        
        {/* React のクライアントランタイムを置く・`</body>` の直前に置くこと https://react-router-docs-ja.techtalk.jp/api/components/Scripts */}
        <Scripts />
      </body>
    </html>
  );
}

/** 現在のルートに対応するページを描画するアプリケーションルート */
export default function App(): ReactElement {
  return (<Outlet />);
}

/** クライアントのハイドレーションが完了するまで余計な `console.log` 表示が出ないように空表示するフォールバック */
export function HydrateFallback(): ReactElement {
  return (<></>);
}

/** ルート描画時の例外を共通エラーページとして表示する */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps): ReactElement {
  let title: string = 'エラー';
  let text : string = 'エラーが発生しました';
  if(isRouteErrorResponse(error)) {
    if(error.status === 404) {
      title = '404';
      text  = 'ページが見つかりませんでした';
    }
    if(!isEmpty(error.statusText)) text = error.statusText;
  }
  
  return (
    <main className="mx-3 my-4 alert alert-vertical alert-soft alert-error">
      <h1>{title}</h1>
      <p>{text}</p>
      
      <p><Link to="/" className="hover:underline">トップに戻る</Link></p>
    </main>
  );
}
