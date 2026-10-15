import request, { type ApiResult } from '@/lib/request';
import type { Book, BookType, Chapter, PageResult } from '@/types';

// ================== 书籍管理 ==================

export const getBookListService = (page = 1, size = 10, params: Record<string, unknown> = {}) =>
  request.get<ApiResult<PageResult<Book>>>('/v1/book/product/list', {
    params: { page, size, ...params },
  });

export const getBookByIdService = (id: number | string) =>
  request.get<ApiResult<Book>>(`/v1/book/product/${id}`);

export const addBookService = (data: Partial<Book>) =>
  request.post<ApiResult<void>>('/v1/book/product', data);

export const updateBookService = (data: Partial<Book>) =>
  request.put<ApiResult<void>>('/v1/book/product', data);

export const deleteBookService = (id: number | string) =>
  request.delete<ApiResult<void>>(`/v1/book/product/${id}`);

export const updateBookCoverService = (bookId: number | string, file: File) => {
  const formData = new FormData();
  formData.append('bookId', String(bookId));
  formData.append('image', file);
  return request.put<ApiResult<string>>('/v1/book/product/cover', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const searchBookService = (keyword: string, page = 1, size = 10) =>
  request.get<ApiResult<PageResult<Book>>>('/v1/book/product/search', {
    params: { keyword, page, size },
  });

export const searchBookByAuthorService = (keyword: string, page = 1, size = 10) =>
  request.get<ApiResult<PageResult<Book>>>('/v1/book/product/search/author', {
    params: { keyword, page, size },
  });

// ================== 书籍类型 ==================

export const getAllTypesService = () =>
  request.get<ApiResult<BookType[]>>('/v1/book/type/all');

export const getTypeListService = (page = 1, size = 10) =>
  request.get<ApiResult<PageResult<BookType>>>('/v1/book/type/list', { params: { page, size } });

export const getTypeByIdService = (id: number | string) =>
  request.get<ApiResult<BookType>>(`/v1/book/type/${id}`);

export const addTypeService = (data: Partial<BookType>) =>
  request.post<ApiResult<void>>('/v1/book/type', data);

export const updateTypeService = (data: Partial<BookType>) =>
  request.put<ApiResult<void>>('/v1/book/type', data);

export const deleteTypeService = (id: number | string) =>
  request.delete<ApiResult<void>>(`/v1/book/type/${id}`);

// ================== 章节 ==================

export const getChapterListService = (bookId: number | string, page = 1, size = 10) =>
  request.get<ApiResult<PageResult<Chapter>>>('/v1/book/chapter/page', {
    params: { bookId, page, size },
  });

export const getAllChaptersService = (bookId: number | string) =>
  request.get<ApiResult<Chapter[]>>('/v1/book/chapter/list', { params: { bookId } });

export const getChapterByIdService = (id: number | string) =>
  request.get<ApiResult<Chapter>>(`/v1/book/chapter/${id}`);

export const getChapterContentService = (id: number | string) =>
  request.get<ApiResult<string>>(`/v1/book/chapter/content/${id}`);

export const addChapterService = (data: Partial<Chapter>) =>
  request.post<ApiResult<void>>('/v1/book/chapter', data);

export const updateChapterService = (data: Partial<Chapter>) =>
  request.put<ApiResult<void>>('/v1/book/chapter', data);

export const deleteChapterService = (id: number | string) =>
  request.delete<ApiResult<void>>(`/v1/book/chapter/${id}`);

// ================== 收藏 ==================

export const getFavoriteListService = (page = 1, size = 10) =>
  request.get<ApiResult<PageResult<Record<string, unknown>>>>('/v1/book/favorite/list', {
    params: { page, size },
  });

export const getFavoriteByIdService = (id: number | string) =>
  request.get<ApiResult<Record<string, unknown>>>(`/v1/book/favorite/${id}`);

export const addFavoriteService = (data: Record<string, unknown>) =>
  request.post<ApiResult<unknown>>('/v1/book/favorite', data);

export const deleteFavoriteService = (id: number | string) =>
  request.delete<ApiResult<unknown>>(`/v1/book/favorite/${id}`);

export const deleteFavoriteByBookService = (bookId: number | string, chapterId?: number | string) =>
  chapterId
    ? request.delete<ApiResult<unknown>>(`/v1/book/favorite/book/${bookId}/chapter/${chapterId}`)
    : request.delete<ApiResult<unknown>>(`/v1/book/favorite/book/${bookId}`);

export const getFavoriteChaptersService = (bookId: number | string, page = 1, size = 10) =>
  request.get<ApiResult<PageResult<Record<string, unknown>>>>(`/v1/book/favorite/chapters/${bookId}`, {
    params: { page, size },
  });

// ================== 豆瓣书源 ==================

export const searchDoubanService = (query: string, page = 1) =>
  request.get('/v1/book/douban/search', { params: { query, page } });

export const getDoubanDetailService = (doubanId: number | string) =>
  request.get(`/v1/book/douban/${doubanId}`);

export const importDoubanBookService = (id: number | string) =>
  request.post('/v1/book/douban/import', null, { params: { id } });
