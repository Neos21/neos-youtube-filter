/** `blocked_patterns` テーブルの保存済みレコード */
export type BlockedPattern = {
  id: number;
  type: 'string' | 'regexp';
  pattern: string;
  /** 正規表現の場合のフラグを示す : 空文字はフラグなし・文字列型の場合でも空文字を保存する */
  flags: string;
  created_at: string;
};
