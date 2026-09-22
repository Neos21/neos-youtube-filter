import ky from 'ky';
import { type ChangeEvent, type ReactElement, type SubmitEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { isEmpty } from '../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../shared/helpers/merge-issues';
import { loginSchema, passwordDisplayName } from '../../../shared/schemas/login-schema';
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
  
  /** 入力されたパスワードを検証し、ログインに成功した場合は JWT を保存してホームページに遷移する */
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrorMessage('');
    
    const payload = { password };
    const parsed = loginSchema.safeParse(payload);
    if(!parsed.success) return setErrorMessage(mergeIssues(parsed.error));
    
    setIsSubmitting(true);
    try {
      const response = await ky.post('/api/login', { json: parsed.data }).json<{ result: { token: string; }; }>();
      useAdminStore.getState().setToken(response.result.token);
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
      <h1>Example</h1>
      
      {shouldRequestRelogin && (
        <div className="mb-4 alert alert-soft alert-warning">再度ログインしてください</div>
      )}
      
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="password" value={password} onChange={onChangePassword} disabled={isSubmitting}
          className="input w-full" placeholder={passwordDisplayName}
          autoComplete="current-password"
        />
        
        {!isEmpty(errorMessage) && (
          <div className="alert alert-soft alert-error">{errorMessage}</div>
        )}
        
        <button type="submit" className="btn" disabled={isSubmitting || isEmpty(password)}>Login</button>
      </form>
    </main>
  );
}
