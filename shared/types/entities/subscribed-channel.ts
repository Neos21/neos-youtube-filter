/** `subscribed_channels` テーブルの保存済みレコード */
export type SubscribedChannel = {
  id: number;
  handle: string | null;
  channel_id: string | null;
  title: string | null;
  created_at: string;
};
