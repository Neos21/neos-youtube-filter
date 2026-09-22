/** 認証によるリダイレクト理由を一時保存する SessionStorage キー */
export const sessionStorageKeyAuthenticationRedirectReason = 'authentication-redirect-reason' as const;
/** 認証によるリダイレクト理由 : 再ログインが必要 */
export const authenticationRedirectReasonReloginRequired   = 'relogin-required' as const;
/** 認証によるリダイレクト理由 : ユーザ操作によるログアウト */
export const authenticationRedirectReasonLogout            = 'logout' as const;
