import { type ReactElement, type SubmitEvent, useEffect, useState } from 'react';

import { isEmpty } from '../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../shared/helpers/merge-issues';
import { createBlockedVideoSchema, updateBlockedVideoSchema } from '../../../shared/schemas/blocked-video-schema';
import { adminApi } from '../../helpers/admin-api';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';

import type { BlockedVideo } from '../../../shared/types/entities/blocked-video';

/** 非表示動画管理ページ */
export default function BlockedVideos(): ReactElement {
  const [blockedVideos, setBlockedVideos] = useState<Array<BlockedVideo>>([]);  // 一覧
  const [isLoading    , setIsLoading    ] = useState<boolean>(true);            // 一覧の取得中か否か
  const [listError    , setListError    ] = useState<string>('');               // 一覧取得エラー
  const [isSubmitting , setIsSubmitting ] = useState<boolean>(false);           // 追加・更新・削除中か否か
  
  const [isCreateOpen , setIsCreateOpen ] = useState<boolean>(false);  // 新規登録モーダルを表示するか否か
  const [createVideoId, setCreateVideoId] = useState<string>('');      // 新規登録する動画 ID または URL
  const [createTitle  , setCreateTitle  ] = useState<string>('');      // 新規登録する参考タイトル
  const [createError  , setCreateError  ] = useState<string>('');      // 新規登録エラー
  
  const [editingBlockedVideo, setEditingBlockedVideo] = useState<BlockedVideo | null>(null);  // 編集対象・`null` は編集モーダルを閉じた状態
  const [editTitle          , setEditTitle          ] = useState<string>('');                 // 編集中の参考タイトル・空文字で未設定に戻す
  const [editError          , setEditError          ] = useState<string>('');                 // 更新・削除エラー
  
  /** 一覧を再取得する */
  const onLoadVideos = async (): Promise<void> => {
    setIsLoading(true);
    setListError('');
    try {
      const response = await adminApi.get('/api/blocked-videos').json<{ result: Array<BlockedVideo>; }>();
      setBlockedVideos(response.result);
    }
    catch(error) {
      setListError(extractApiErrorMessage(error, '非表示動画の一覧取得に失敗しました'));
    }
    finally {
      setIsLoading(false);
    }
  };
  
  // 初期表示時に一覧を取得する
  useEffect(() => {
    (async () => {
      await onLoadVideos();
    })();
  }, []);
  
  /** 新規登録フォームを空にして開く */
  const onStartCreate = (): void => {
    setCreateVideoId('');
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
    
    // 動画 ID 欄に URL ごと入力された場合も検証してパースする
    const parsed = createBlockedVideoSchema.safeParse({ video_id: createVideoId, title: createTitle });
    if(!parsed.success) return setCreateError(mergeIssues(parsed.error));
    
    setIsSubmitting(true);
    try {
      await adminApi.post('/api/blocked-videos', { json: parsed.data }).json<{ result: BlockedVideo; }>();
      setIsCreateOpen(false);
      await onLoadVideos();
    }
    catch(error) {
      setCreateError(extractApiErrorMessage(error, '非表示動画の追加に失敗しました'));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  /** 選択した動画のタイトルを編集フォームに設定する */
  const onStartEdit = (blockedVideo: BlockedVideo): void => {
    setEditingBlockedVideo(blockedVideo);
    setEditTitle(blockedVideo.title ?? '');
    setEditError('');
  };
  
  /** 編集モーダルを閉じる */
  const onCloseEdit = (): void => {
    if(isSubmitting) return;
    setEditingBlockedVideo(null);
  };
  
  /** 更新する */
  const onUpdate = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if(isSubmitting || editingBlockedVideo == null) return;
    
    setEditError('');
    
    const parsed = updateBlockedVideoSchema.safeParse({ title: editTitle });
    if(!parsed.success) return setEditError(mergeIssues(parsed.error));
    
    setIsSubmitting(true);
    try {
      await adminApi.patch(`/api/blocked-videos/${editingBlockedVideo.id}`, { json: parsed.data }).json<{ result: BlockedVideo; }>();
      setEditingBlockedVideo(null);
      await onLoadVideos();
    }
    catch(error) {
      setEditError(extractApiErrorMessage(error, '非表示動画の更新に失敗しました'));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  /** 選択した動画を削除し、成功後に一覧を再取得する */
  const onDelete = async (): Promise<void> => {
    if(isSubmitting || editingBlockedVideo == null) return;
    
    setEditError('');
    
    if(!window.confirm(`動画「${editingBlockedVideo.video_id}」を削除しますか？`)) return;
    
    setIsSubmitting(true);
    try {
      await adminApi.delete(`/api/blocked-videos/${editingBlockedVideo.id}`).json<{ result: true; }>();
      setEditingBlockedVideo(null);
      await onLoadVideos();
    }
    catch(error) {
      setEditError(extractApiErrorMessage(error, '非表示動画の削除に失敗しました'));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <main>
      <h1>非表示動画</h1>
      
      <div className="mb-4 text-right">
        <button type="button" className="btn btn-info" onClick={onStartCreate} disabled={isLoading || isSubmitting}>新規登録</button>
      </div>
      
      {!isEmpty(listError) && (
        <div className="mb-4 alert alert-soft alert-error">
          <span>{listError}</span>
          <button type="button" className="btn btn-sm" onClick={onLoadVideos} disabled={isLoading || isSubmitting}>再取得</button>
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
          </colgroup>
          <thead>
            <tr>
              <th>ID</th>
              <th>動画 ID</th>
              <th>動画タイトル</th>
              <th className="text-center">登録日時</th>
              <th className="text-center">編集</th>
            </tr>
          </thead>
          <tbody>
            {blockedVideos.map(blockedVideo => (
              <tr key={blockedVideo.id}>
                <td className="text-right whitespace-nowrap">{blockedVideo.id}</td>
                <td className="whitespace-nowrap">{blockedVideo.video_id}</td>
                <td className="wrap-break-word">{blockedVideo.title ?? '-'}</td>
                <td className="text-center whitespace-nowrap">{blockedVideo.created_at}</td>
                <td className="text-center whitespace-nowrap"><button type="button" className="btn btn-xs" onClick={() => onStartEdit(blockedVideo)} disabled={isLoading || isSubmitting}>編集</button></td>
              </tr>
            ))}
            {!isLoading && isEmpty(listError) && blockedVideos.length === 0 && (
              <tr>
                <td colSpan={5}>登録されている非表示動画はありません</td>
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
                <label className="fieldset-label">動画 ID または YouTube URL</label>
                <input className="input w-full" value={createVideoId} onChange={event => setCreateVideoId(event.target.value)} required disabled={isSubmitting} />
              </fieldset>
              
              <fieldset className="fieldset">
                <label className="fieldset-label">動画タイトル (任意)</label>
                <input className="input w-full" value={createTitle} onChange={event => setCreateTitle(event.target.value)} disabled={isSubmitting} />
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
      
      {editingBlockedVideo != null && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h2 className="mb-4 text-lg font-bold">編集</h2>
            <form onSubmit={onUpdate}>
              <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                <dt>ID</dt>
                <dd>{editingBlockedVideo.id}</dd>
                <dt>動画 ID</dt>
                <dd>{editingBlockedVideo.video_id}</dd>
                <dt>登録日時</dt>
                <dd>{editingBlockedVideo.created_at}</dd>
              </dl>
              
              <fieldset className="fieldset" disabled={isSubmitting}>
                <label className="fieldset-label">動画タイトル (任意)</label>
                <input className="input w-full" value={editTitle} onChange={event => setEditTitle(event.target.value)} disabled={isSubmitting} />
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
