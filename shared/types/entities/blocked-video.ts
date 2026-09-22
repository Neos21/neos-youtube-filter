/** `blocked_videos` テーブルの保存済みレコード */
export type BlockedVideo = {
  id: number;
  video_id: string;
  title: string | null;
  created_at: string;
};
