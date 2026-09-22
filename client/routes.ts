import { index, layout, route, type RouteConfig } from '@react-router/dev/routes';

/** クライアントルート定義 */
export default [
  index('./pages/index/index.tsx'),
  layout('./layouts/admin-layout.tsx', [
    route('/home'            , './pages/home/home.tsx'),
    route('/blocked-videos'  , './pages/blocked-videos/blocked-videos.tsx'),
    route('/blocked-channels', './pages/blocked-channels/blocked-channels.tsx'),
    route('/blocked-patterns', './pages/blocked-patterns/blocked-patterns.tsx')
  ])
] satisfies RouteConfig;
