// 导入request.js请求工具
import request from '@/utils/request.js'

// =============== 文档管理接口 ===============

// 获取文档详情
export const getDocumentByIdService = (id) => {
  return request.get(`/v1/document/${id}`);
}

// 更新文档信息
export const updateDocumentService = (id, data) => {
  return request.put(`/v1/document/${id}`, null, {
    params: {
      title: data.title,
      description: data.description,
      folderId: data.folderId
    }
  });
}

// 删除文档
export const deleteDocumentService = (id) => {
  return request.delete(`/v1/document/${id}`);
}

// 更新文档内容
export const updateDocumentContentService = (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  return request.put(`/v1/document/${id}/content`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
}

// 上传文档
export const uploadDocumentService = (data) => {
  const formData = new FormData();
  formData.append('file', data.file);
  
  return request.post('/v1/document/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    params: {
      title: data.title,
      description: data.description,
      folderId: data.folderId
    }
  });
}

// 获取文档版本历史
export const getDocumentVersionsService = (id) => {
  return request.get(`/v1/document/${id}/versions`);
}

// 搜索文档
export const searchDocumentsService = (params) => {
  return request.get('/v1/document/search', {
    params: params
  });
}

// 分页查询文档列表
export const getDocumentListService = (params) => {
  return request.get('/v1/document/list', {
    params: params
  });
}

// 根据文件夹ID查询文档列表
export const getDocumentsByFolderService = (folderId, params) => {
  return request.get(`/v1/document/folder/${folderId}`, {
    params: params
  });
}

// =============== 文件夹管理接口 ===============

// 获取文件夹详情
export const getFolderByIdService = (id) => {
  return request.get(`/v1/document/folder/${id}`);
}

// 更新文件夹
export const updateFolderService = (id, name) => {
  return request.put(`/v1/document/folder/${id}`, null, {
    params: {
      name: name
    }
  });
}

// 删除文件夹
export const deleteFolderService = (id) => {
  return request.delete(`/v1/document/folder/${id}`);
}

// 创建文件夹
export const createFolderService = (name, parentId) => {
  return request.post('/v1/document/folder', null, {
    params: {
      name: name,
      parentId: parentId
    }
  });
}

// 获取文件夹列表
export const getFolderListService = (parentId) => {
  return request.get('/v1/document/folder/list', {
    params: {
      parentId: parentId
    }
  });
} 