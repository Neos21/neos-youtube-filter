import { isEmpty } from '../helpers/is-empty';
import { normalizeYouTubeIdentifier } from '../services/normalize-youtube-identifier';

/** 空の任意項目を `null` に変換する */
export const normalizeNullable = (value: unknown): unknown => value == null || (typeof value === 'string' && isEmpty(value)) ? null : value;

/** 動画 URL または動画 ID を保存用の識別子に整形する */
export const preprocessVideoId = (value: unknown): unknown => normalizeYouTubeIdentifier(value, 'video');
/** チャンネル URL またはチャンネル ID を整形し、空の入力は `null` にする */
export const preprocessChannelId = (value: unknown): unknown => normalizeNullable(normalizeYouTubeIdentifier(value, 'channel'));
/** ハンドル URL またはハンドルを整形し、空の入力は `null` にする */
export const preprocessHandle = (value: unknown): unknown => normalizeNullable(normalizeYouTubeIdentifier(value, 'handle'));
