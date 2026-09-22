import { index, layout, route, type RouteConfig } from '@react-router/dev/routes';

/** クライアントルート定義 */
export default [
  index('./pages/index/index.tsx'),
  layout('./layouts/admin-layout.tsx', [
    route('/home', './pages/home/home.tsx')
  ])
] satisfies RouteConfig;
