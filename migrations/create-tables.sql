-- テーブルを新規作成する

CREATE TABLE blocked_videos (  -- 動画単位で非表示にする
  id        INTEGER  PRIMARY KEY  AUTOINCREMENT,
  video_id  TEXT     NOT NULL     UNIQUE  CHECK (length(trim(video_id)) > 0),  -- 動画 ID
  title     TEXT  -- 参考用動画名
);

CREATE TABLE blocked_channels (  -- チャンネル単位で非表示にする : 識別子はアプリ側で正規化し、不明な値は空文字ではなく `NULL` で保存する
  id          INTEGER  PRIMARY KEY  AUTOINCREMENT,
  handle      TEXT     UNIQUE  CHECK (handle     IS NULL OR length(trim(handle))     > 0),  -- ハンドル (`@XXX` 形式)
  channel_id  TEXT     UNIQUE  CHECK (channel_id IS NULL OR length(trim(channel_id)) > 0),  -- チャンネル ID (`UC` から始まる文字列)
  title       TEXT,  -- 参考用チャンネル名
  CHECK (handle IS NOT NULL OR channel_id IS NOT NULL)
);

CREATE TABLE blocked_patterns (  -- 文字列か正規表現で非表示にする
  id       INTEGER  PRIMARY KEY  AUTOINCREMENT,
  type     TEXT     NOT NULL  CHECK (type IN ('string', 'regexp')),  -- 種別 : 文字列か正規表現か
  pattern  TEXT     NOT NULL  CHECK (length(pattern) > 0),           -- パターン
  flags    TEXT     NOT NULL  DEFAULT 'iu',  -- 正規表現の場合のフラグ : 文字列型の登録では明示的に空文字を指定し、正規表現のフラグなしも空文字で表す
  CHECK (type = 'regexp' OR flags = '')
);

CREATE TABLE subscribed_channels (  -- 購読済チャンネル : ブロック情報とは独立して同じチャンネルを登録できる
  id          INTEGER  PRIMARY KEY  AUTOINCREMENT,
  handle      TEXT     UNIQUE  CHECK (handle     IS NULL OR length(trim(handle))     > 0),  -- ハンドル
  channel_id  TEXT     UNIQUE  CHECK (channel_id IS NULL OR length(trim(channel_id)) > 0),  -- チャンネル ID
  title       TEXT,  -- 参考用チャンネル名
  CHECK (handle IS NOT NULL OR channel_id IS NOT NULL)
);
