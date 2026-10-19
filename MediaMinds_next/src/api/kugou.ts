import request, { type ApiResult } from '@/lib/request';
import type { Song } from '@/types';

const prefix = '/v1/music/kugou';

/** 在线搜索维度 */
export type KugouDimension = 'song' | 'singer' | 'album';

/**
 * 在线搜索（按维度）。
 * song → data.songs[]；singer → data.singers[]；album → data.albums[]。
 */
export const searchKugouService = (
  keyword: string,
  type: KugouDimension = 'song',
  page = 1,
  size = 30,
) => request.get<ApiResult<unknown>>(`${prefix}/search`, { params: { keyword, type, page, size } });

/** 获取播放直链 */
export const getKugouPlayUrlService = (
  hash: string,
  quality = '128',
  albumAudioId = '',
  albumId = '',
) => request.get<ApiResult<unknown>>(`${prefix}/url`, { params: { hash, quality, albumAudioId, albumId } });

/** 获取歌词 */
export const getKugouLyricService = (hash: string, albumAudioId = '', keyword = '') =>
  request.get<ApiResult<unknown>>(`${prefix}/lyric`, { params: { hash, albumAudioId, keyword } });

/** 榜单列表 */
export const getKugouRankListService = () => request.get<ApiResult<unknown>>(`${prefix}/rank/list`);

/** 榜单歌曲 */
export const getKugouRankAudioService = (
  rankId: string | number,
  rankCid = 0,
  page = 1,
  size = 30,
) => request.get<ApiResult<unknown>>(`${prefix}/rank/audio`, { params: { rankId, rankCid, page, size } });

/** 推荐榜单 */
export const getKugouRankTopService = () => request.get<ApiResult<unknown>>(`${prefix}/rank/top`);

/** 热门歌单 */
export const getKugouSheetHotService = (opernType = 1) =>
  request.get<ApiResult<unknown>>(`${prefix}/sheet/hot`, { params: { opernType } });

/** 歌单歌曲 */
export const getKugouSheetSongsService = (
  collectionId: string | number,
  beginIdx = 0,
  size = 30,
) => request.get<ApiResult<unknown>>(`${prefix}/sheet/songs`, { params: { collectionId, beginIdx, size } });

/** 发送短信验证码 */
export const sendKugouSmsCodeService = (mobile: string) =>
  request.post<ApiResult<unknown>>(`${prefix}/login/sms/send`, null, { params: { mobile } });

/** 手机验证码登录 */
export const kugouLoginByMobileService = (mobile: string, code: string) =>
  request.post<ApiResult<unknown>>(`${prefix}/login/sms`, { mobile, code });

/** 获取登录二维码 */
export const getKugouQrKeyService = () => request.get<ApiResult<unknown>>(`${prefix}/login/qr`);

/** 查询扫码状态 */
export const getKugouQrStatusService = (key: string) =>
  request.get<ApiResult<unknown>>(`${prefix}/login/qr/status`, { params: { key } });

/** 导入歌曲到本地曲库；返回落库后的 Song 实体（含自增 id，可继续加入歌单） */
export const importKugouSongService = (song: Record<string, unknown>) =>
  request.post<ApiResult<Song>>(`${prefix}/import`, song);

/** 按本地歌曲 ID 重新解析酷狗播放直链（直链过期 / 重新登录后播放前调用） */
export const refreshKugouSongUrlService = (songId: number | string) =>
  request.post<ApiResult<string>>(`${prefix}/url/by-song`, null, { params: { songId } });

/** 酷狗登录状态（登录态持久化在 music_data.kugou_auth，重启后仍在） */
export interface KugouLoginStatus {
  loggedIn: boolean;
  userId: string;
}

export const getKugouLoginStatusService = () =>
  request.get<ApiResult<KugouLoginStatus>>(`${prefix}/login/status`);

export const kugouLogoutService = () => request.post<ApiResult<unknown>>(`${prefix}/logout`);
