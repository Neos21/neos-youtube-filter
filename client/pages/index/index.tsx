import ky from 'ky';
import { type ChangeEvent, type ReactElement, type SubmitEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { isEmpty } from '../../../shared/helpers/is-empty';
import { authenticationRedirectReasonReloginRequired, sessionStorageKeyAuthenticationRedirectReason } from '../../constants/client-constants';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';
import { useAdminStore } from '../../stores/admin-store';

/** トップページ (ログインページ) */
export default function Index(): ReactElement {
  const navigate = useNavigate();
  
  const [shouldRequestRelogin] = useState<boolean>(() => sessionStorage.getItem(sessionStorageKeyAuthenticationRedirectReason) === authenticationRedirectReasonReloginRequired);  // SessionStorage に再ログイン要求があるか否か・現在の表示中だけメッセージ表示に使用する
  
  // 再ログインメッセージの表示有無に関わらず表示要求を次回のトップページ表示に持ち越さない
  useEffect((): void => {
    sessionStorage.removeItem(sessionStorageKeyAuthenticationRedirectReason);
  }, []);
  
  const [password    , setPassword    ] = useState<string>('');      // パスワード
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);  // ログイン処理中か否か
  const [errorMessage, setErrorMessage] = useState<string>('');      // ログイン時のエラーメッセージ
  
  /** パスワード入力時に表示中のエラーメッセージも消去する */
  const onChangePassword = (event: ChangeEvent<HTMLInputElement>): void => {
    setPassword(event.target.value);
    if(!isEmpty(errorMessage)) setErrorMessage('');
  };
  
  /** 入力されたパスワードを検証し、ログインに成功した場合はトークンを保存してホームページに遷移する */
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      // 入力されたパスワード文字列をそのまま Bearer トークンとして設定し、API 共通基盤でのチェックに回す
      await ky.post('/api/login', { headers: { Authorization: `Bearer ${password}` } }).json<{ result: true; }>();
      useAdminStore.getState().setToken(password);
      navigate('/home');
    }
    catch(error) {
      setErrorMessage(extractApiErrorMessage(error, 'ログインに失敗しました'));
      setIsSubmitting(false);
    }
  };
  
  return (
    <main className="px-3 py-4">
      {/* `main` 要素の余白は `admin-layout.tsx` の `Outlet` ラッパーと揃えておく */}
      <h1>Neo's YouTube Filter</h1>
      
      <form onSubmit={onSubmit} className="mb-4 flex gap-x-2">
        <input
          type="password" value={password} onChange={onChangePassword} disabled={isSubmitting}
          className="input w-full flex-1 input-sm" placeholder="Password" autoComplete="current-password"
        />
        <button type="submit" className="btn shrink-0 btn-sm" disabled={isSubmitting || isEmpty(password)}>Login</button>
      </form>
      
      {shouldRequestRelogin && (
        <div className="mb-4 alert alert-soft alert-warning">再度ログインしてください</div>
      )}
      
      {!isEmpty(errorMessage) && (
        <div className="alert alert-soft alert-error">{errorMessage}</div>
      )}
    </main>
  );
}
