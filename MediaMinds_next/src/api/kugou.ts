import request, { type ApiResult } from '@/lib/request';

const prefix = '/v1/music/kugou';

/** 搜索歌曲 */
export const searchKugouSongsService = (keyword: string, page = 1, size = 30) =>
  request.get<ApiResult<unknown>>(`${prefix}/search`, { params: { keyword, page, size } });

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

/** 导入歌曲到本地曲库 */
export const importKugouSongService = (song: Record<string, unknown>) =>
  request.post<ApiResult<void>>(`${prefix}/import`, song);
