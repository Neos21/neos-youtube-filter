import { type ReactElement, type SubmitEvent, useEffect, useState } from 'react';

import { isEmpty } from '../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../shared/helpers/merge-issues';
import { createBlockedPatternSchema, updateBlockedPatternSchema } from '../../../shared/schemas/blocked-pattern-schema';
import { adminApi } from '../../helpers/admin-api';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';

import type { BlockedPattern } from '../../../shared/types/entities/blocked-pattern';

/** 非表示パターン管理ページ */
export default function BlockedPatterns(): ReactElement {
  const [blockedPatterns, setBlockedPatterns] = useState<Array<BlockedPattern>>([]);  // 一覧
  const [isLoading      , setIsLoading      ] = useState<boolean>(true);              // 一覧の取得中か否か
  const [listError      , setListError      ] = useState<string>('');                 // 一覧取得エラー
  const [isSubmitting   , setIsSubmitting   ] = useState<boolean>(false);             // 追加・更新・削除中か否か
  
  const [isCreateOpen , setIsCreateOpen ] = useState<boolean>(false);                    // 新規登録モーダルを表示するか否か
  const [createType   , setCreateType   ] = useState<BlockedPattern['type']>('string');  // 新規登録する種別
  const [createPattern, setCreatePattern] = useState<string>('');                        // 新規登録するパターン・前後の空白も保持する
  const [createFlags  , setCreateFlags  ] = useState<string>('iu');                      // 正規表現のフラグ・空文字はフラグなし
  const [createError  , setCreateError  ] = useState<string>('');                        // 新規登録エラー
  
  const [editingBlockedPattern, setEditingBlockedPattern] = useState<BlockedPattern | null>(null);       // 編集対象・`null` は編集モーダルを閉じた状態
  const [editType             , setEditType             ] = useState<BlockedPattern['type']>('string');  // 編集中の種別
  const [editPattern          , setEditPattern          ] = useState<string>('');                        // 編集中のパターン・前後の空白も保持する
  const [editFlags            , setEditFlags            ] = useState<string>('iu');                      // 編集中の正規表現のフラグ・空文字はフラグなし
  const [editError            , setEditError            ] = useState<string>('');                        // 更新・削除エラー
  
  /** 一覧を再取得する */
  const onLoadBlockedPatterns = async (): Promise<void> => {
    setIsLoading(true);
    setListError('');
    try {
      const response = await adminApi.get('/api/blocked-patterns').json<{ result: Array<BlockedPattern>; }>();
      setBlockedPatterns(response.result);
    }
    catch(error) {
      setListError(extractApiErrorMessage(error, '非表示パターンの一覧取得に失敗しました'));
    }
    finally {
      setIsLoading(false);
    }
  };
  
  // 初期表示時に一覧を取得する
  useEffect(() => {
    (async () => {
      await onLoadBlockedPatterns();
    })();
  }, []);
  
  /** 新規登録フォームを空にして開く */
  const onStartCreate = (): void => {
    setCreateType('string');
    setCreatePattern('');
    setCreateFlags('iu');
    setCreateError('');
    setIsCreateOpen(true);
  };
  
  /** 新規登録モーダルを閉じる */
  const onCloseCreate = (): void => {
    if(isSubmitting) return;
    setIsCreateOpen(false);
  };
  
  /** 登録する */
  const onCreate = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if(isSubmitting) return;
    
    setCreateError('');
    
    const parsed = createBlockedPatternSchema.safeParse({ type: createType, pattern: createPattern, flags: createFlags });
    if(!parsed.success) return setCreateError(mergeIssues(parsed.error));
    
    setIsSubmitting(true);
    try {
      await adminApi.post('/api/blocked-patterns', { json: parsed.data }).json<{ result: BlockedPattern; }>();
      setIsCreateOpen(false);
      await onLoadBlockedPatterns();
    }
    catch(error) {
      setCreateError(extractApiErrorMessage(error, '非表示パターンの追加に失敗しました'));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  /** 選択したパターンの種別・文字列・フラグを編集フォームに設定する */
  const onStartEdit = (blockedPattern: BlockedPattern): void => {
    setEditingBlockedPattern(blockedPattern);
    setEditType(blockedPattern.type);
    setEditPattern(blockedPattern.pattern);
    // 文字列型の保存済みフラグは未使用のため、正規表現に切り替えた場合の初期値を用意する
    setEditFlags(blockedPattern.type === 'regexp' ? blockedPattern.flags : 'iu');
    setEditError('');
  };
  
  /** 編集モーダルを閉じる */
  const onCloseEdit = (): void => {
    if(isSubmitting) return;
    setEditingBlockedPattern(null);
  };
  
  /** 更新する */
  const onUpdate = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if(isSubmitting || editingBlockedPattern == null) return;
    
    setEditError('');
    
    const parsed = updateBlockedPatternSchema.safeParse({ type: editType, pattern: editPattern, flags: editFlags });
    if(!parsed.success) return setEditError(mergeIssues(parsed.error));
    
    setIsSubmitting(true);
    try {
      await adminApi.patch(`/api/blocked-patterns/${editingBlockedPattern.id}`, { json: parsed.data }).json<{ result: BlockedPattern; }>();
      setEditingBlockedPattern(null);
      await onLoadBlockedPatterns();
    }
    catch(error) {
      setEditError(extractApiErrorMessage(error, '非表示パターンの更新に失敗しました'));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  /** 削除する */
  const onDelete = async (): Promise<void> => {
    if(isSubmitting || editingBlockedPattern == null) return;
    
    setEditError('');
    
    if(!window.confirm(`パターン「${editingBlockedPattern.pattern}」を削除しますか？`)) return;
    
    setIsSubmitting(true);
    try {
      await adminApi.delete(`/api/blocked-patterns/${editingBlockedPattern.id}`).json<{ result: true; }>();
      setEditingBlockedPattern(null);
      await onLoadBlockedPatterns();
    }
    catch(error) {
      setEditError(extractApiErrorMessage(error, '非表示パターンの削除に失敗しました'));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <main>
      <h1 className="mb-4 font-bold">非表示パターン</h1>
      
      <div className="mb-4 text-right">
        <button type="button" className="btn btn-info" onClick={onStartCreate} disabled={isLoading || isSubmitting}>新規登録</button>
      </div>
      
      {!isEmpty(listError) && (
        <div className="mb-4 alert alert-soft alert-error">
          <span>{listError}</span>
          <button type="button" className="btn btn-error btn-sm" onClick={onLoadBlockedPatterns} disabled={isLoading || isSubmitting}>再取得</button>
        </div>
      )}
      
      {isLoading && (
        <div className="text-center">
          <span className="loading loading-spinner text-warning" />
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="table table-xs">
          <colgroup>
            <col className="w-px" />
            <col className="w-px" />
            <col />
            <col className="w-px" />
            <col className="w-px" />
            <col className="w-px" />
          </colgroup>
          <thead>
            <tr>
              <th>ID</th>
              <th>種別</th>
              <th>パターン・フラグ</th>
              <th className="text-center">登録日時</th>
              <th className="text-center">編集</th>
            </tr>
          </thead>
          <tbody>
            {blockedPatterns.map(blockedPattern => (
              <tr key={blockedPattern.id}>
                <td className="text-right whitespace-nowrap">{blockedPattern.id}</td>
                <td className="whitespace-nowrap">{blockedPattern.type === 'string' ? '文字列' : '正規表現'}</td>
                <td className="font-mono wrap-break-word whitespace-pre-wrap">
                  {blockedPattern.type === 'regexp' && (<span className="mr-[.2em] text-neutral-content">/</span>)}
                  {blockedPattern.pattern}
                  {blockedPattern.type === 'regexp' && (<span className="mx-[.2em] text-neutral-content">/</span>)}
                  {blockedPattern.type === 'regexp' && !isEmpty(blockedPattern.flags) && blockedPattern.flags}
                </td>
                <td className="text-center whitespace-nowrap">{blockedPattern.created_at}</td>
                <td className="text-center whitespace-nowrap"><button type="button" className="btn btn-xs" onClick={() => onStartEdit(blockedPattern)} disabled={isLoading || isSubmitting}>編集</button></td>
              </tr>
            ))}
            {!isLoading && isEmpty(listError) && blockedPatterns.length === 0 && (
              <tr>
                <td colSpan={5}>登録されている非表示パターンはありません</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {isCreateOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h2 className="mb-4 text-lg font-bold">新規登録</h2>
            <form onSubmit={onCreate}>
              <fieldset className="fieldset">
                <label className="fieldset-label">種別</label>
                <select className="select w-full" value={createType} onChange={event => setCreateType(event.target.value === 'regexp' ? 'regexp' : 'string')} disabled={isSubmitting}>
                  <option value="string">文字列</option>
                  <option value="regexp">正規表現</option>
                </select>
              </fieldset>
              
              <fieldset className="fieldset">
                <label className="fieldset-label">パターン</label>
                <input type="text" className="input w-full" value={createPattern} onChange={event => setCreatePattern(event.target.value)} required disabled={isSubmitting} />
                <p>{createType === 'string' ? '大文字・小文字を区別しない部分一致で判定します' : '正規表現は / で囲まずに入力してください'}</p>
              </fieldset>
              
              {createType === 'regexp' && (
                <fieldset className="fieldset">
                  <label className="fieldset-label">フラグ</label>
                  <input type="text" className="input w-full" value={createFlags} onChange={event => setCreateFlags(event.target.value)} disabled={isSubmitting} />
                  <p>初期値は iu です・空欄にするとフラグなしで保存します</p>
                </fieldset>
              )}
              
              {!isEmpty(createError) && (
                <div className="alert alert-soft alert-error">{createError}</div>
              )}
              
              <div className="modal-action justify-between">
                <button type="button" className="btn" onClick={onCloseCreate} disabled={isSubmitting}>キャンセル</button>
                <button type="submit" className="btn btn-info" disabled={isSubmitting}>追加する</button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={onCloseCreate} />
        </div>
      )}
      
      {editingBlockedPattern != null && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h2 className="mb-4 text-lg font-bold">編集</h2>
            <form onSubmit={onUpdate}>
              <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                <dt>ID</dt>
                <dd>{editingBlockedPattern.id}</dd>
                <dt>登録日時</dt>
                <dd>{editingBlockedPattern.created_at}</dd>
              </dl>
              
              <fieldset className="fieldset">
                <label className="fieldset-label">種別</label>
                <select className="select w-full" value={editType} onChange={event => setEditType(event.target.value === 'regexp' ? 'regexp' : 'string')} disabled={isSubmitting}>
                  <option value="string">文字列</option>
                  <option value="regexp">正規表現</option>
                </select>
              </fieldset>
              
              <fieldset className="fieldset">
                <label className="fieldset-label">パターン</label>
                <input type="text" className="input w-full" value={editPattern} onChange={event => setEditPattern(event.target.value)} required disabled={isSubmitting} />
                <p>{editType === 'string' ? '大文字・小文字を区別しない部分一致で判定します' : '正規表現は / で囲まずに入力してください'}</p>
              </fieldset>
              
              {editType === 'regexp' && (
                <fieldset className="fieldset">
                  <label className="fieldset-label">フラグ</label>
                  <input type="text" className="input w-full" value={editFlags} onChange={event => setEditFlags(event.target.value)} disabled={isSubmitting} />
                  <p>初期値は iu です・空欄にするとフラグなしで保存します</p>
                </fieldset>
              )}
              
              {!isEmpty(editError) && (
                <div className="alert alert-soft alert-error">{editError}</div>
              )}
              
              <div className="modal-action justify-between">
                <button type="button" className="btn btn-error" onClick={onDelete} disabled={isSubmitting}>削除する</button>
                <button type="button" className="btn" onClick={onCloseEdit} disabled={isSubmitting}>キャンセル</button>
                <button type="submit" className="btn btn-info" disabled={isSubmitting}>更新する</button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={onCloseEdit} />
        </div>
      )}
    </main>
  );
}
