<template>
  <div class="document-manager">
    <el-container>
      <el-aside width="250px" class="folder-tree-container">
        <div class="folder-header">
          <h3>文件夹</h3>
          <el-button type="primary" size="small" @click="showCreateFolderDialog">
            <el-icon><Plus /></el-icon>
          </el-button>
        </div>
        <el-tree
          ref="folderTree"
          :data="folderList"
          :props="defaultProps"
          @node-click="handleNodeClick"
          highlight-current
          :expand-on-click-node="false"
          node-key="id"
          default-expand-all
        >
          <template #default="{ node, data }">
            <div class="custom-tree-node">
              <span>
                <el-icon><Folder /></el-icon>
                {{ node.label }}
              </span>
              <span v-if="data.id">
                <el-dropdown @command="(command) => handleFolderCommand(command, data)">
                  <el-button type="text" size="small">
                    <el-icon><More /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="rename">重命名</el-dropdown-item>
                      <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </span>
            </div>
          </template>
        </el-tree>
      </el-aside>
      
      <el-container>
        <el-header height="60px" class="document-header">
          <div class="header-left">
            <h2>{{ currentFolder ? currentFolder.name : '所有文档' }}</h2>
          </div>
          <div class="header-right">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索文档"
              prefix-icon="Search"
              @keyup.enter="handleSearch"
              clearable
              @clear="resetSearch"
            />
            <el-button type="primary" @click="showUploadDialog">
              <el-icon><Upload /></el-icon> 上传文档
            </el-button>
          </div>
        </el-header>
        
        <el-main class="document-list-container">
          <el-empty v-if="documentList.length === 0" description="暂无文档" />
          
          <el-table
            v-else
            :data="documentList"
            stripe
            style="width: 100%"
            border
          >
            <el-table-column prop="title" label="文档名称">
              <template #default="scope">
                <div class="document-title">
                  <el-icon><Document /></el-icon>
                  <span @click="previewDocument(scope.row)" class="document-name">{{ scope.row.title }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="fileType" label="类型" width="100" />
            <el-table-column prop="fileSize" label="大小" width="100">
              <template #default="scope">
                {{ formatFileSize(scope.row.fileSize) }}
              </template>
            </el-table-column>
            <el-table-column prop="updatedAt" label="修改时间" width="180">
              <template #default="scope">
                {{ formatDate(scope.row.updatedAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="220">
              <template #default="scope">
                <el-button-group>
                  <el-button size="small" type="primary" @click="previewDocument(scope.row)">
                    <el-icon><View /></el-icon>
                  </el-button>
                  <el-button size="small" type="primary" @click="downloadDocument(scope.row)">
                    <el-icon><Download /></el-icon>
                  </el-button>
                  <el-button size="small" type="primary" @click="editDocument(scope.row)">
                    <el-icon><Edit /></el-icon>
                  </el-button>
                  <el-button size="small" type="danger" @click="deleteDocument(scope.row)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </el-button-group>
              </template>
            </el-table-column>
          </el-table>
          
          <div class="pagination-container">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="total"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </el-main>
      </el-container>
    </el-container>
    
    <!-- 创建文件夹对话框 -->
    <el-dialog
      v-model="createFolderDialog"
      title="创建文件夹"
      width="30%"
    >
      <el-form :model="folderForm" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="folderForm.name" placeholder="请输入文件夹名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="createFolderDialog = false">取消</el-button>
          <el-button type="primary" @click="createFolder">确认</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 重命名文件夹对话框 -->
    <el-dialog
      v-model="renameFolderDialog"
      title="重命名文件夹"
      width="30%"
    >
      <el-form :model="folderForm" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="folderForm.name" placeholder="请输入文件夹名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="renameFolderDialog = false">取消</el-button>
          <el-button type="primary" @click="updateFolder">确认</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 上传文档对话框 -->
    <el-dialog
      v-model="uploadDocumentDialog"
      title="上传文档"
      width="40%"
    >
      <el-form :model="documentForm" label-width="80px">
        <el-form-item label="标题" required>
          <el-input v-model="documentForm.title" placeholder="请输入文档标题" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="documentForm.description" type="textarea" placeholder="请输入文档描述" />
        </el-form-item>
        <el-form-item label="文件" required>
          <el-upload
            class="upload-demo"
            drag
            action="#"
            :auto-upload="false"
            :on-change="handleFileChange"
            :limit="1"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              拖拽文件到此处或 <em>点击上传</em>
            </div>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="uploadDocumentDialog = false">取消</el-button>
          <el-button type="primary" @click="uploadDocument">上传</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 编辑文档对话框 -->
    <el-dialog
      v-model="editDocumentDialog"
      title="编辑文档"
      width="40%"
    >
      <el-form :model="documentForm" label-width="80px">
        <el-form-item label="标题" required>
          <el-input v-model="documentForm.title" placeholder="请输入文档标题" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="documentForm.description" type="textarea" placeholder="请输入文档描述" />
        </el-form-item>
        <el-form-item label="文件夹">
          <el-select v-model="documentForm.folderId" placeholder="请选择文件夹" clearable>
            <el-option label="根目录" :value="null" />
            <el-option
              v-for="folder in flatFolderList"
              :key="folder.id"
              :label="folder.name"
              :value="folder.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editDocumentDialog = false">取消</el-button>
          <el-button type="primary" @click="updateDocumentInfo">确认</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 预览文档对话框 -->
    <el-dialog
      v-model="previewDocumentDialog"
      title="文档预览"
      width="80%"
      top="5vh"
      :append-to-body="true"
      :destroy-on-close="true"
      class="document-preview-dialog"
    >
      <template v-if="currentDocument">
        <div class="document-preview-header">
          <h3>{{ currentDocument.title }}</h3>
          <p>{{ currentDocument.description }}</p>
          <p>版本: {{ currentDocument.version }} | 更新时间: {{ formatDate(currentDocument.updatedAt) }}</p>
        </div>
        <div class="document-preview-content">
          <!-- Office文档预览 -->
          <iframe v-if="currentDocument && getPreviewUrl(currentDocument)"
            :src="getPreviewUrl(currentDocument)"
            width="100%" height="600" frameborder="0"></iframe>
          
          <!-- 图片预览 -->
          <div v-else-if="currentDocument && isImageFile(currentDocument)" class="image-preview">
            <img :src="currentDocument.ossUrl" alt="文档预览" style="max-width: 100%; max-height: 600px;" />
          </div>
          
          <!-- 不支持的格式 -->
          <el-empty v-else description="无法在线预览此文件类型，请点击下载按钮下载查看">
            <el-button type="primary" @click="downloadDocument(currentDocument)">下载文件</el-button>
          </el-empty>
        </div>
        <div class="document-version-list" v-if="documentVersions.length > 0">
          <h4>版本历史</h4>
          <el-table :data="documentVersions" border style="width: 100%">
            <el-table-column prop="versionNumber" label="版本" width="80" />
            <el-table-column prop="createdAt" label="创建时间" width="180">
              <template #default="scope">
                {{ formatDate(scope.row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column prop="fileSize" label="大小" width="120">
              <template #default="scope">
                {{ formatFileSize(scope.row.fileSize) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="scope">
                <el-button size="small" type="primary" @click="downloadVersion(scope.row)">下载</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Folder, Document, More, Search, Upload, View, Download, Edit, Delete, UploadFilled } from '@element-plus/icons-vue'
import {
  getFolderListService,
  createFolderService,
  updateFolderService,
  deleteFolderService,
  getFolderByIdService,
  getDocumentListService,
  getDocumentsByFolderService,
  getDocumentByIdService,
  updateDocumentService,
  deleteDocumentService,
  updateDocumentContentService,
  uploadDocumentService,
  getDocumentVersionsService,
  searchDocumentsService
} from '@/api/document.js'

// 变量定义
const folderList = ref([]);
const flatFolderList = ref([]);
const currentFolder = ref(null);
const documentList = ref([]);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const searchKeyword = ref('');
const isSearchMode = ref(false);

// 对话框控制
const createFolderDialog = ref(false);
const renameFolderDialog = ref(false);
const uploadDocumentDialog = ref(false);
const editDocumentDialog = ref(false);
const previewDocumentDialog = ref(false);

// 表单数据
const folderForm = reactive({
  id: '',
  name: '',
  parentId: null
});
const documentForm = reactive({
  id: '',
  title: '',
  description: '',
  folderId: null,
  file: null
});

// 当前选中的文档和版本列表
const currentDocument = ref(null);
const documentVersions = ref([]);

// 树形结构配置
const defaultProps = {
  children: 'children',
  label: 'name'
};

// 初始化
onMounted(() => {
  loadFolderList();
  loadDocumentList();
});

// 加载文件夹列表
const loadFolderList = async () => {
  try {
    const res = await getFolderListService();
    if (res.code === 200) {
      // 构建树形结构
      const buildTree = (items, parentId = null) => {
        const result = [];
        const filtered = items.filter(item => item.parentId === parentId);
        
        filtered.forEach(item => {
          const children = buildTree(items, item.id);
          if (children.length) {
            item.children = children;
          }
          result.push(item);
        });
        
        return result;
      };

      folderList.value = [{
        id: null,
        name: '所有文档',
        children: buildTree(res.data)
      }];
      
      // 构建扁平化文件夹列表，用于下拉选择
      flatFolderList.value = res.data;
    }
  } catch (error) {
    console.error('加载文件夹失败:', error);
    ElMessage.error('加载文件夹失败');
  }
};

// 加载文档列表
const loadDocumentList = async (folderIdParam = null) => {
  try {
    if (isSearchMode.value) {
      return; // 搜索模式下不重新加载文档列表
    }
    
    currentPage.value = 1;
    const params = {
      page: currentPage.value,
      size: pageSize.value
    };
    
    let res;
    if (folderIdParam) {
      res = await getDocumentsByFolderService(folderIdParam, params);
    } else {
      res = await getDocumentListService(params);
    }
    
    if (res.code === 200) {
      documentList.value = res.data.records;
      total.value = res.data.total;
    }
  } catch (error) {
    console.error('加载文档失败:', error);
    ElMessage.error('加载文档失败');
  }
};

// 点击文件夹节点
const handleNodeClick = async (data) => {
  isSearchMode.value = false;
  searchKeyword.value = '';
  currentFolder.value = data.id ? data : null;
  await loadDocumentList(data.id);
};

// 分页处理
const handleSizeChange = async (val) => {
  pageSize.value = val;
  if (isSearchMode.value) {
    await handleSearch();
  } else {
    await loadDocumentList(currentFolder.value?.id);
  }
};

const handleCurrentChange = async (val) => {
  currentPage.value = val;
  if (isSearchMode.value) {
    await handleSearch();
  } else {
    await loadDocumentList(currentFolder.value?.id);
  }
};

// 搜索文档
const handleSearch = async () => {
  if (!searchKeyword.value.trim()) {
    return;
  }
  
  isSearchMode.value = true;
  try {
    const res = await searchDocumentsService({
      page: currentPage.value,
      size: pageSize.value,
      keyword: searchKeyword.value
    });
    
    if (res.code === 200) {
      documentList.value = res.data.records;
      total.value = res.data.total;
    }
  } catch (error) {
    console.error('搜索文档失败:', error);
    ElMessage.error('搜索文档失败');
  }
};

// 重置搜索
const resetSearch = async () => {
  if (isSearchMode.value) {
    isSearchMode.value = false;
    await loadDocumentList(currentFolder.value?.id);
  }
};

// 文件夹操作
const showCreateFolderDialog = () => {
  folderForm.name = '';
  folderForm.parentId = currentFolder.value?.id || null;
  createFolderDialog.value = true;
};

const createFolder = async () => {
  if (!folderForm.name.trim()) {
    ElMessage.warning('请输入文件夹名称');
    return;
  }
  
  try {
    const res = await createFolderService(folderForm.name, folderForm.parentId);
    if (res.code === 200) {
      ElMessage.success('创建文件夹成功');
      createFolderDialog.value = false;
      await loadFolderList();
    }
  } catch (error) {
    console.error('创建文件夹失败:', error);
    ElMessage.error('创建文件夹失败');
  }
};

const handleFolderCommand = (command, data) => {
  if (command === 'rename') {
    folderForm.id = data.id;
    folderForm.name = data.name;
    renameFolderDialog.value = true;
  } else if (command === 'delete') {
    ElMessageBox.confirm('确定要删除该文件夹吗？其中的文档将不会被删除。', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(async () => {
      try {
        const res = await deleteFolderService(data.id);
        if (res.code === 200) {
          ElMessage.success('删除文件夹成功');
          await loadFolderList();
          if (currentFolder.value?.id === data.id) {
            currentFolder.value = null;
            await loadDocumentList();
          }
        }
      } catch (error) {
        console.error('删除文件夹失败:', error);
        ElMessage.error('删除文件夹失败');
      }
    }).catch(() => {});
  }
};

const updateFolder = async () => {
  if (!folderForm.name.trim()) {
    ElMessage.warning('请输入文件夹名称');
    return;
  }
  
  try {
    const res = await updateFolderService(folderForm.id, folderForm.name);
    if (res.code === 200) {
      ElMessage.success('修改文件夹成功');
      renameFolderDialog.value = false;
      await loadFolderList();
    }
  } catch (error) {
    console.error('修改文件夹失败:', error);
    ElMessage.error('修改文件夹失败');
  }
};

// 文档操作
const showUploadDialog = () => {
  documentForm.title = '';
  documentForm.description = '';
  documentForm.folderId = currentFolder.value?.id || null;
  documentForm.file = null;
  uploadDocumentDialog.value = true;
};

const handleFileChange = (file) => {
  documentForm.file = file.raw;
  if (!documentForm.title) {
    documentForm.title = file.name.split('.')[0];
  }
};

const uploadDocument = async () => {
  if (!documentForm.title.trim()) {
    ElMessage.warning('请输入文档标题');
    return;
  }
  
  if (!documentForm.file) {
    ElMessage.warning('请选择文件');
    return;
  }
  
  try {
    const res = await uploadDocumentService({
      title: documentForm.title,
      description: documentForm.description,
      folderId: documentForm.folderId,
      file: documentForm.file
    });
    
    if (res.code === 200) {
      ElMessage.success('上传文档成功');
      uploadDocumentDialog.value = false;
      await loadDocumentList(currentFolder.value?.id);
    }
  } catch (error) {
    console.error('上传文档失败:', error);
    ElMessage.error('上传文档失败');
  }
};

const previewDocument = async (document) => {
  try {
    const res = await getDocumentByIdService(document.id);
    if (res.code === 200) {
      currentDocument.value = res.data;
      
      // 获取版本历史
      const versionsRes = await getDocumentVersionsService(document.id);
      if (versionsRes.code === 200) {
        documentVersions.value = versionsRes.data;
      }
      
      previewDocumentDialog.value = true;
    }
  } catch (error) {
    console.error('获取文档详情失败:', error);
    ElMessage.error('获取文档详情失败');
  }
};

const downloadDocument = (document) => {
  if (document.ossUrl) {
    window.open(document.ossUrl);
  } else {
    ElMessage.warning('文档下载地址不可用');
  }
};

const downloadVersion = (version) => {
  if (version.ossUrl) {
    window.open(version.ossUrl);
  } else {
    ElMessage.warning('版本下载地址不可用');
  }
};

const editDocument = (document) => {
  documentForm.id = document.id;
  documentForm.title = document.title;
  documentForm.description = document.description;
  documentForm.folderId = document.folderId;
  editDocumentDialog.value = true;
};

const updateDocumentInfo = async () => {
  if (!documentForm.title.trim()) {
    ElMessage.warning('请输入文档标题');
    return;
  }
  
  try {
    const res = await updateDocumentService(documentForm.id, {
      title: documentForm.title,
      description: documentForm.description,
      folderId: documentForm.folderId
    });
    
    if (res.code === 200) {
      ElMessage.success('更新文档成功');
      editDocumentDialog.value = false;
      if (isSearchMode.value) {
        await handleSearch();
      } else {
        await loadDocumentList(currentFolder.value?.id);
      }
    }
  } catch (error) {
    console.error('更新文档失败:', error);
    ElMessage.error('更新文档失败');
  }
};

const deleteDocument = (document) => {
  ElMessageBox.confirm('确定要删除该文档吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res = await deleteDocumentService(document.id);
      if (res.code === 200) {
        ElMessage.success('删除文档成功');
        if (isSearchMode.value) {
          await handleSearch();
        } else {
          await loadDocumentList(currentFolder.value?.id);
        }
      }
    } catch (error) {
      console.error('删除文档失败:', error);
      ElMessage.error('删除文档失败');
    }
  }).catch(() => {});
};

// 获取文档预览URL
const getPreviewUrl = (document) => {
  if (!document || !document.ossUrl) return '';
  
  // 判断文档类型
  const fileType = document.fileType?.toLowerCase();
  
  // Office文档使用Office Online Viewer
  if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(fileType)) {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(document.ossUrl)}`;
  }
  
  // PDF文档直接嵌入
  if (fileType === 'pdf') {
    return document.ossUrl;
  }
  
  // 图片文件直接嵌入
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileType)) {
    return document.ossUrl;
  }
  
  // 其他文件类型无法直接预览
  return '';
};

// 判断是否可以使用图片预览器
const isImageFile = (document) => {
  if (!document || !document.fileType) return false;
  return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(document.fileType.toLowerCase());
};

// 判断是否可以使用PDF预览器
const isPdfFile = (document) => {
  if (!document || !document.fileType) return false;
  return document.fileType.toLowerCase() === 'pdf';
};

// 工具函数
const formatFileSize = (size) => {
  if (!size) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index++;
  }
  
  return `${size.toFixed(2)} ${units[index]}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};
</script>

<style scoped>
.document-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.folder-tree-container {
  border-right: 1px solid #e0e0e0;
  padding: 10px;
  height: calc(100vh - 64px);
  overflow-y: auto;
}

.folder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.custom-tree-node {
  display: flex;
  justify-content: space-between;
  width: 100%;
  align-items: center;
}

.document-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e0e0e0;
  padding: 0 20px;
}

.header-right {
  display: flex;
  gap: 10px;
}

.document-list-container {
  padding: 20px;
  height: calc(100vh - 124px);
  overflow-y: auto;
}

.document-title {
  display: flex;
  align-items: center;
  gap: 5px;
}

.document-name {
  color: #409eff;
  cursor: pointer;
}

.document-name:hover {
  text-decoration: underline;
}

.document-preview-header {
  margin-bottom: 20px;
}

.document-preview-content {
  margin-bottom: 20px;
}

.image-preview {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.document-version-list {
  margin-top: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.document-preview-dialog {
  margin: 0 auto !important; /* 修改为居中显示 */
}

/* 设置全局样式 */
:deep(.el-dialog) {
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  margin: 0 auto !important; /* 修改为居中显示 */
  position: relative !important; /* 确保定位正确 */
}

:deep(.el-dialog .el-dialog__body) {
  overflow: auto;
  flex: 1;
}
</style> 