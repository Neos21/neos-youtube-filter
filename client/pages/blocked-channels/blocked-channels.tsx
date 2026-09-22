import { type ReactElement, type SubmitEvent, useEffect, useState } from 'react';

import { isEmpty } from '../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../shared/helpers/merge-issues';
import { createBlockedChannelSchema, updateBlockedChannelSchema } from '../../../shared/schemas/blocked-channel-schema';
import { adminApi } from '../../helpers/admin-api';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';

import type { BlockedChannel } from '../../../shared/types/entities/blocked-channel';

/** 非表示チャンネル管理ページ */
export default function BlockedChannels(): ReactElement {
  const [blockedChannels, setBlockedChannels] = useState<Array<BlockedChannel>>([]);  // 一覧
  const [isLoading      , setIsLoading      ] = useState<boolean>(true);              // 一覧の取得中か否か
  const [listError      , setListError      ] = useState<string>('');                 // 一覧取得エラー
  const [isSubmitting   , setIsSubmitting   ] = useState<boolean>(false);             // 追加・更新・削除中か否か
  
  const [isCreateOpen   , setIsCreateOpen   ] = useState<boolean>(false);  // 新規登録モーダルを表示するか否か
  const [createHandle   , setCreateHandle   ] = useState<string>('');      // 新規登録するハンドルまたは URL
  const [createChannelId, setCreateChannelId] = useState<string>('');      // 新規登録するチャンネル ID または URL
  const [createTitle    , setCreateTitle    ] = useState<string>('');      // 新規登録するチャンネル名
  const [createError    , setCreateError    ] = useState<string>('');      // 新規登録エラー
  
  const [editingBlockedChannel, setEditingBlockedChannel] = useState<BlockedChannel | null>(null);  // 編集対象・`null` は編集モーダルを閉じた状態
  const [editHandle           , setEditHandle           ] = useState<string>('');                   // 編集中のハンドル・空文字で未設定に戻す
  const [editChannelId        , setEditChannelId        ] = useState<string>('');                   // 編集中のチャンネル ID・空文字で未設定に戻す
  const [editTitle            , setEditTitle            ] = useState<string>('');                   // 編集中のチャンネル名・空文字で未設定に戻す
  const [editError            , setEditError            ] = useState<string>('');                   // 更新・削除エラー
  
  /** 一覧を再取得する */
  const onLoadBlockedChannels = async (): Promise<void> => {
    setIsLoading(true);
    setListError('');
    try {
      const response = await adminApi.get('/api/blocked-channels').json<{ result: Array<BlockedChannel>; }>();
      setBlockedChannels(response.result);
    }
    catch(error) {
      setListError(extractApiErrorMessage(error, '非表示チャンネルの一覧取得に失敗しました'));
    }
    finally {
      setIsLoading(false);
    }
  };
  
  // 初期表示時に一覧を取得する
  useEffect(() => {
    (async () => {
      await onLoadBlockedChannels();
    })();
  }, []);
  
  /** 新規登録フォームを空にして開く */
  const onStartCreate = (): void => {
    setCreateHandle('');
    setCreateChannelId('');
    setCreateTitle('');
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
    
    // ハンドル・チャンネル ID 欄に URL ごと入力された場合も検証してパースする
    const parsed = createBlockedChannelSchema.safeParse({ handle: createHandle, channel_id: createChannelId, title: createTitle });
    if(!parsed.success) return setCreateError(mergeIssues(parsed.error));
    
    setIsSubmitting(true);
    try {
      await adminApi.post('/api/blocked-channels', { json: parsed.data }).json<{ result: BlockedChannel; }>();
      setIsCreateOpen(false);
      await onLoadBlockedChannels();
    }
    catch(error) {
      setCreateError(extractApiErrorMessage(error, '非表示チャンネルの追加に失敗しました'));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  /** 選択したチャンネルの識別子と名前を編集フォームに設定する */
  const onStartEdit = (blockedChannel: BlockedChannel): void => {
    setEditingBlockedChannel(blockedChannel);
    setEditHandle(blockedChannel.handle ?? '');
    setEditChannelId(blockedChannel.channel_id ?? '');
    setEditTitle(blockedChannel.title ?? '');
    setEditError('');
  };
  
  /** 編集モーダルを閉じる */
  const onCloseEdit = (): void => {
    if(isSubmitting) return;
    setEditingBlockedChannel(null);
  };
  
  /** 更新する */
  const onUpdate = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if(isSubmitting || editingBlockedChannel == null) return;
    
    setEditError('');
    
    const parsed = updateBlockedChannelSchema.safeParse({ handle: editHandle, channel_id: editChannelId, title: editTitle });
    if(!parsed.success) return setEditError(mergeIssues(parsed.error));
    
    setIsSubmitting(true);
    try {
      await adminApi.patch(`/api/blocked-channels/${editingBlockedChannel.id}`, { json: parsed.data }).json<{ result: BlockedChannel; }>();
      setEditingBlockedChannel(null);
      await onLoadBlockedChannels();
    }
    catch(error) {
      setEditError(extractApiErrorMessage(error, '非表示チャンネルの更新に失敗しました'));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  /** 削除する */
  const onDelete = async (): Promise<void> => {
    if(isSubmitting || editingBlockedChannel == null) return;
    
    setEditError('');
    
    if(!window.confirm(`チャンネル「${editingBlockedChannel.handle ?? editingBlockedChannel.channel_id}」を削除しますか？`)) return;
    
    setIsSubmitting(true);
    try {
      await adminApi.delete(`/api/blocked-channels/${editingBlockedChannel.id}`).json<{ result: true; }>();
      setEditingBlockedChannel(null);
      await onLoadBlockedChannels();
    }
    catch(error) {
      setEditError(extractApiErrorMessage(error, '非表示チャンネルの削除に失敗しました'));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <main>
      <h1 className="mb-4 font-bold">非表示チャンネル</h1>
      
      <div className="mb-4 text-right">
        <button type="button" className="btn btn-info" onClick={onStartCreate} disabled={isLoading || isSubmitting}>新規登録</button>
      </div>
      
      {!isEmpty(listError) && (
        <div className="mb-4 alert alert-soft alert-error">
          <span>{listError}</span>
          <button type="button" className="btn btn-error btn-sm" onClick={onLoadBlockedChannels} disabled={isLoading || isSubmitting}>再取得</button>
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
            <col className="w-px" />
            <col />
            <col className="w-px" />
            <col className="w-px" />
          </colgroup>
          <thead>
            <tr>
              <th>ID</th>
              <th>ハンドル</th>
              <th>チャンネル ID</th>
              <th>チャンネル名</th>
              <th className="text-center">登録日時</th>
              <th className="text-center">編集</th>
            </tr>
          </thead>
          <tbody>
            {blockedChannels.map(blockedChannel => (
              <tr key={blockedChannel.id}>
                <td className="text-right whitespace-nowrap">{blockedChannel.id}</td>
                <td className="whitespace-nowrap">
                  {blockedChannel.handle == null ? '-' : (
                    <a href={`https://www.youtube.com/${blockedChannel.handle}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">{blockedChannel.handle}</a>
                  )}
                </td>
                <td className="whitespace-nowrap">
                  {blockedChannel.channel_id == null ? '-' : (
                    <a href={`https://www.youtube.com/channel/${blockedChannel.channel_id}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">{blockedChannel.channel_id}</a>
                  )}
                </td>
                <td className="wrap-break-word">{blockedChannel.title ?? '-'}</td>
                <td className="text-center whitespace-nowrap">{blockedChannel.created_at}</td>
                <td className="text-center whitespace-nowrap"><button type="button" className="btn btn-xs" onClick={() => onStartEdit(blockedChannel)} disabled={isLoading || isSubmitting}>編集</button></td>
              </tr>
            ))}
            {!isLoading && isEmpty(listError) && blockedChannels.length === 0 && (
              <tr>
                <td colSpan={6}>登録されている非表示チャンネルはありません</td>
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
              <p className="mb-4">ハンドルかチャンネル ID のどちらかを入力してください</p>
              
              <fieldset className="fieldset">
                <label className="fieldset-label">ハンドルまたは YouTube URL</label>
                <input type="text" className="input w-full" value={createHandle} onChange={event => setCreateHandle(event.target.value)} disabled={isSubmitting} />
              </fieldset>
              
              <fieldset className="fieldset">
                <label className="fieldset-label">チャンネル ID または YouTube URL</label>
                <input type="text" className="input w-full" value={createChannelId} onChange={event => setCreateChannelId(event.target.value)} disabled={isSubmitting} />
              </fieldset>
              
              <fieldset className="fieldset">
                <label className="fieldset-label">チャンネル名 (任意)</label>
                <input type="text" className="input w-full" value={createTitle} onChange={event => setCreateTitle(event.target.value)} disabled={isSubmitting} />
              </fieldset>
              
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
      
      {editingBlockedChannel != null && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h2 className="mb-4 text-lg font-bold">編集</h2>
            <form onSubmit={onUpdate}>
              <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                <dt>ID</dt>
                <dd>{editingBlockedChannel.id}</dd>
                <dt>登録日時</dt>
                <dd>{editingBlockedChannel.created_at}</dd>
              </dl>
              
              <p className="mb-4">ハンドルかチャンネル ID のどちらかを入力してください</p>
              
              <fieldset className="fieldset">
                <label className="fieldset-label">ハンドルまたは YouTube URL</label>
                <input type="text" className="input w-full" value={editHandle} onChange={event => setEditHandle(event.target.value)} disabled={isSubmitting} />
              </fieldset>
              
              <fieldset className="fieldset">
                <label className="fieldset-label">チャンネル ID または YouTube URL</label>
                <input type="text" className="input w-full" value={editChannelId} onChange={event => setEditChannelId(event.target.value)} disabled={isSubmitting} />
              </fieldset>
              
              <fieldset className="fieldset" disabled={isSubmitting}>
                <label className="fieldset-label">チャンネル名 (任意)</label>
                <input type="text" className="input w-full" value={editTitle} onChange={event => setEditTitle(event.target.value)} disabled={isSubmitting} />
              </fieldset>
              
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
