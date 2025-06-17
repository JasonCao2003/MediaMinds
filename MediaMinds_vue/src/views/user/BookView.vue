<template>
  <div class="book-view">
    <div class="page-header">
      <h2>图书浏览</h2>
    </div>
    
    <!-- 搜索和筛选 -->
    <el-card class="filter-card">
      <div class="filter-container">
        <div class="search-group">
          <el-input
            v-model="searchKeyword"
            placeholder="输入图书名或作者名"
            clearable
            class="search-input"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
            <template #append>
              <el-button @click="searchKeyword = ''">清空</el-button>
            </template>
          </el-input>
        </div>
        
        <div class="action-group">
          <el-select
            v-model="selectedType"
            placeholder="选择分类"
            clearable
            @change="handleTypeChange"
            class="type-select"
          >
            <el-option label="所有分类" :value="null" />
            <el-option
              v-for="type in bookTypes"
              :key="type.id"
              :label="type.typeName"
              :value="type.id"
            />
          </el-select>
          
          <el-radio-group v-model="activeView" @change="handleViewChange" class="view-selector">
            <el-radio-button label="all">全部图书</el-radio-button>
            <el-radio-button label="favorite">我的收藏</el-radio-button>
          </el-radio-group>
        </div>
      </div>
    </el-card>

    <!-- 推荐图书 -->
    <div class="recommend-section" v-if="!searchKeyword && !selectedType && !loading && activeView === 'all'">
      <div class="section-title">
        <h3>推荐图书</h3>
        <p>根据您的阅读偏好为您推荐</p>
      </div>
      
      <el-carousel :interval="5000" type="card" height="300px" v-if="recommendBooks.length > 0">
        <el-carousel-item v-for="book in recommendBooks" :key="book.id">
          <div class="carousel-item" @click="goToBookDetail(book)">
            <el-image :src="book.cover" :alt="book.title" class="carousel-img" fit="cover">
              <template #error>
                <div class="image-placeholder">
                  <el-icon><Document /></el-icon>
                </div>
              </template>
            </el-image>
            <div class="carousel-info">
              <h3>{{ book.title }}</h3>
              <p>{{ book.author }}</p>
            </div>
          </div>
        </el-carousel-item>
      </el-carousel>
      <el-empty description="暂无推荐图书" v-else />
    </div>

    <!-- 图书列表 -->
    <div class="book-list-container">
      <div class="section-title">
        <h3>{{ getBookListTitle }}</h3>
      </div>
      
      <div class="books-grid" v-loading="loading">
        <el-card 
          v-for="book in displayBookList" 
          :key="book.id"
          class="book-card" 
          shadow="hover" 
          @click="goToBookDetail(book)"
        >
          <div class="book-cover">
            <el-image :src="book.cover" :alt="book.title" fit="cover">
              <template #error>
                <div class="image-placeholder">
                  <el-icon><Document /></el-icon>
                </div>
              </template>
            </el-image>
            <div class="book-type">{{ getTypeName(book.typeId) }}</div>
            <div class="book-actions">
              <el-button 
                circle
                class="action-btn read-btn" 
                @click.stop="startReading(book)"
                title="阅读"
              >
                <el-icon><View /></el-icon>
              </el-button>
              <el-button 
                circle
                class="action-btn favorite-btn" 
                @click.stop="toggleFavorite(book)"
                :title="book.isFavorite ? '取消收藏' : '收藏'"
              >
                <el-icon>
                  <StarFilled v-if="book.isFavorite" />
                  <Star v-else />
                </el-icon>
              </el-button>
            </div>
          </div>
          <div class="book-info">
            <h3 class="book-title">{{ book.title }}</h3>
            <div class="book-author">{{ book.author }}</div>
            <div class="book-description">{{ book.description }}</div>
          </div>
        </el-card>
      </div>

      <!-- 分页 -->
      <div class="pagination-container" v-if="total > 0">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[12, 24, 36, 48]"
          :background="true"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>

      <!-- 空状态 -->
      <el-empty 
        :description="activeView === 'favorite' ? '暂无收藏图书' : '没有找到相关图书'" 
        v-if="displayBookList.length === 0 && !loading" 
      />
    </div>

    <!-- 图书详情对话框 -->
    <el-dialog
      v-model="showBookDetail"
      :title="selectedBook.title"
      width="80%"
      top="5vh"
      class="book-detail-dialog"
      append-to-body
    >
      <div class="book-detail-content" v-if="selectedBook.id">
        <div class="book-detail-top">
          <div class="book-detail-cover">
            <el-image :src="selectedBook.cover" :alt="selectedBook.title">
              <template #error>
                <div class="image-placeholder-large">
                  <el-icon><Document /></el-icon>
                </div>
              </template>
            </el-image>
          </div>
          <div class="book-detail-info">
            <h2>{{ selectedBook.title }}</h2>
            <p class="book-detail-author"><strong>作者:</strong> {{ selectedBook.author }}</p>
            <p class="book-detail-type"><strong>分类:</strong> {{ getTypeName(selectedBook.typeId) }}</p>
            <div class="book-detail-actions">
              <el-button type="primary" @click="startReading(selectedBook)">
                <el-icon><View /></el-icon> 开始阅读
              </el-button>
              <el-button 
                :type="selectedBook.isFavorite ? 'warning' : 'info'" 
                @click="toggleFavorite(selectedBook)"
              >
                <el-icon>
                  <StarFilled v-if="selectedBook.isFavorite" />
                  <Star v-else />
                </el-icon>
                {{ selectedBook.isFavorite ? '取消收藏' : '收藏' }}
              </el-button>
            </div>
          </div>
        </div>
        <div class="book-detail-description">
          <h3>图书简介</h3>
          <p>{{ selectedBook.description || '暂无简介' }}</p>
        </div>
        <div class="book-chapters" v-if="bookChapters.length > 0">
          <h3>章节列表</h3>
          <el-table :data="bookChapters" style="width: 100%">
            <el-table-column prop="chapterNumber" label="章节" width="80" />
            <el-table-column prop="chapterTitle" label="标题" />
            <el-table-column prop="wordCount" label="字数" width="100">
              <template #default="scope">
                {{ scope.row.wordCount }} 字
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="scope">
                <el-button 
                  size="small" 
                  type="primary" 
                  @click="readChapter(selectedBook, scope.row)"
                >
                  <el-icon><View /></el-icon> 阅读
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <el-empty description="暂无章节" v-else />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Star, StarFilled, View, Search, Document } from '@element-plus/icons-vue'
import { 
  getBookListService,
  getBookByIdService,
  getRecommendBooksService, 
  searchBookService, 
  searchBookByAuthorService,
  getAllTypesService,
  getAllChaptersService,
  getFavoriteListService,
  addFavoriteService,
  deleteFavoriteByBookService
} from '@/api/book.js'

const router = useRouter()

// 状态变量
const loading = ref(false)
const bookList = ref([])
const favoriteBookList = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(12)
const bookTypes = ref([])
const recommendBooks = ref([])
const favoriteBooks = ref([])
const searchKeyword = ref('')
const selectedType = ref(null)
const showBookDetail = ref(false)
const selectedBook = ref({})
const bookChapters = ref([])
const searchType = ref('title') // 'title' 或 'author'
const activeView = ref('all') // 'all' 或 'favorite'

// 计算图书列表标题
const getBookListTitle = computed(() => {
  if (activeView.value === 'favorite') {
    return '我的收藏'
  }
  
  if (searchKeyword.value) {
    return `"${searchKeyword.value}" 的搜索结果`
  } else if (selectedType.value) {
    const typeName = bookTypes.value.find(t => t.id === selectedType.value)?.typeName || ''
    return `${typeName} 分类图书`
  }
  return '全部图书'
})

// 根据当前视图显示对应的图书列表
const displayBookList = computed(() => {
  return activeView.value === 'favorite' ? favoriteBookList.value : bookList.value
})

// 格式化数字（过万简化显示）
const formatNumber = (num) => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num
}

// 获取分类名称
const getTypeName = (typeId) => {
  const type = bookTypes.value.find(t => t.id === typeId)
  return type ? type.typeName : '未分类'
}

// 获取图书列表数据
const fetchBookList = async () => {
  loading.value = true
  try {
    let res
    
    if (searchKeyword.value) {
      if (searchType.value === 'author') {
        res = await searchBookByAuthorService(searchKeyword.value, currentPage.value, pageSize.value)
      } else {
        res = await searchBookService(searchKeyword.value, currentPage.value, pageSize.value)
      }
    } else {
      res = await getBookListService(currentPage.value, pageSize.value)
    }
    
    if (res.code === 200) {
      // 处理API返回的数据，确保数据格式统一
      const list = res.data.list || res.data.records || []
      
      bookList.value = list.map(book => ({
        id: book.id,
        title: book.title || book.bookName,
        author: book.author || book.bookAuthor || '未知作者',
        cover: book.cover || book.bookImg,
        description: book.description || book.bookDetails,
        typeId: book.typeId,
        viewCount: book.viewCount || 0,
        favoriteCount: book.favoriteCount || 0
      }))
      
      total.value = res.data.total || 0
      
      // 标记收藏状态
      markFavoriteBooks()
    } else {
      ElMessage.error('获取图书列表失败')
    }
  } catch (error) {
    console.error('获取图书列表错误', error)
    ElMessage.error('获取图书列表出错')
  } finally {
    loading.value = false
  }
}

// 获取图书类型
const fetchBookTypes = async () => {
  try {
    const res = await getAllTypesService()
    if (res.code === 200) {
      bookTypes.value = res.data || []
    }
  } catch (error) {
    console.error('获取图书类型错误', error)
  }
}

// 获取推荐图书
const fetchRecommendBooks = async () => {
  try {
    const res = await getRecommendBooksService()
    if (res.code === 200) {
      // 适配API返回的数据结构 - 直接是数组形式
      const records = Array.isArray(res.data) ? res.data : 
                     (res.data && res.data.records ? res.data.records : [])
                     
      recommendBooks.value = records.map(book => ({
        id: book.id,
        title: book.bookName,
        author: book.bookAuthor || '未知作者',
        cover: book.bookImg,
        description: book.bookDetails,
        typeId: book.typeId,
        viewCount: 0, // API未返回此字段，使用默认值
        favoriteCount: 0, // API未返回此字段，使用默认值
        chapterCount: book.chapterCount
      }))
      
      // 标记收藏状态
      markFavoriteBooks()
    }
  } catch (error) {
    console.error('获取推荐图书错误', error)
  }
}

// 获取用户收藏列表
const fetchFavorites = async () => {
  try {
    const res = await getFavoriteListService(currentPage.value, pageSize.value)
    if (res.code === 200) {
      // 更新收藏列表
      favoriteBooks.value = res.data.records || []
      total.value = res.data.total || 0
      
      // 如果是收藏视图，则直接使用返回的数据
      if (activeView.value === 'favorite') {
        favoriteBookList.value = favoriteBooks.value.map(book => ({
          id: book.id,
          title: book.title || book.bookName,
          author: book.author || book.bookAuthor || '未知作者',
          cover: book.cover || book.bookImg,
          description: book.description || book.bookDetails,
          typeId: book.typeId,
          viewCount: book.viewCount || 0,
          favoriteCount: book.favoriteCount || 0,
          isFavorite: true // 收藏列表中的书默认已收藏
        }))
      }
      
      // 更新图书收藏状态
      markFavoriteBooks()
    }
  } catch (error) {
    console.error('获取收藏列表错误', error)
    ElMessage.error('获取收藏列表失败')
  }
}

// 标记收藏状态
const markFavoriteBooks = () => {
  // 更新推荐图书收藏状态
  recommendBooks.value = recommendBooks.value.map(book => ({
    ...book,
    isFavorite: favoriteBooks.value.some(fb => fb.bookId === book.id)
  }))
  
  // 更新图书列表收藏状态
  bookList.value = bookList.value.map(book => ({
    ...book,
    isFavorite: favoriteBooks.value.some(fb => fb.bookId === book.id)
  }))
  
  // 更新选中图书收藏状态
  if (selectedBook.value.id) {
    selectedBook.value = {
      ...selectedBook.value,
      isFavorite: favoriteBooks.value.some(fb => fb.bookId === selectedBook.value.id)
    }
  }
}

// 切换收藏状态
const toggleFavorite = async (book) => {
  try {
    if (book.isFavorite) {
      // 取消收藏
      const res = await deleteFavoriteByBookService(book.id)
      if (res.code === 200) {
        ElMessage.success('取消收藏成功')
        // 更新收藏状态
        book.isFavorite = false
        // 重新获取收藏列表
        await fetchFavorites()
        
        // 如果是在收藏页面，则需要从列表中移除该书
        if (activeView.value === 'favorite') {
          favoriteBookList.value = favoriteBookList.value.filter(b => b.id !== book.id)
        }
      } else {
        ElMessage.error('取消收藏失败')
      }
    } else {
      // 添加收藏
      const favoriteData = {
        bookId: book.id,
        chapterId: 0  // 默认为0，表示收藏整本书而非特定章节
      }
      const res = await addFavoriteService(favoriteData)
      if (res.code === 200) {
        ElMessage.success('收藏成功')
        // 更新收藏状态
        book.isFavorite = true
        // 重新获取收藏列表
        await fetchFavorites()
      } else {
        ElMessage.error('收藏失败')
      }
    }
  } catch (error) {
    console.error('操作收藏错误', error)
    ElMessage.error('操作收藏失败')
  }
}

// 获取图书章节
const fetchBookChapters = async (bookId) => {
  try {
    const res = await getAllChaptersService(bookId)
    if (res.code === 200) {
      bookChapters.value = res.data || []
    } else {
      bookChapters.value = []
    }
  } catch (error) {
    console.error('获取章节错误', error)
    bookChapters.value = []
  }
}

// 打开图书详情
const goToBookDetail = async (book) => {
  selectedBook.value = book
  showBookDetail.value = true
  
  // 获取章节列表
  await fetchBookChapters(book.id)
}

// 开始阅读（跳转到阅读页面，默认从第一章开始）
const startReading = (book) => {
  showBookDetail.value = false
  router.push(`/content/book/read/${book.id}`)
}

// 阅读特定章节
const readChapter = (book, chapter) => {
  showBookDetail.value = false
  router.push({
    path: `/content/book/read/${book.id}`,
    query: { chapterId: chapter.id }
  })
}

// 搜索处理
const handleSearch = () => {
  if (activeView.value === 'favorite') {
    // 切换到全部图书视图进行搜索
    activeView.value = 'all'
  }
  
  if (searchKeyword.value.trim()) {
    // 判断是按标题还是作者搜索
    if (searchKeyword.value.includes('作者:') || searchKeyword.value.includes('作者：')) {
      searchType.value = 'author'
      searchKeyword.value = searchKeyword.value.replace(/作者[:：]\s*/, '')
    } else {
      searchType.value = 'title'
    }
    currentPage.value = 1 // 重置页码
    fetchBookList()
  } else {
    // 清空搜索条件
    searchKeyword.value = ''
    searchType.value = 'title'
    fetchBookList()
  }
}

// 分类切换
const handleTypeChange = () => {
  if (activeView.value === 'favorite') {
    // 切换到全部图书视图进行分类筛选
    activeView.value = 'all'
  }
  
  currentPage.value = 1 // 重置页码
  fetchBookList()
}

// 视图切换
const handleViewChange = () => {
  currentPage.value = 1 // 重置页码
  
  if (activeView.value === 'favorite') {
    // 切换到收藏视图
    searchKeyword.value = '' // 清空搜索条件
    selectedType.value = null // 清空分类筛选
    fetchFavorites() // 直接使用fetchFavorites获取收藏列表
  } else {
    // 切换到全部图书视图
    fetchBookList()
  }
}

// 分页大小变化
const handleSizeChange = (size) => {
  pageSize.value = size
  if (activeView.value === 'favorite') {
    fetchFavorites() // 直接使用fetchFavorites获取收藏列表
  } else {
    fetchBookList()
  }
}

// 页码变化
const handleCurrentChange = (page) => {
  currentPage.value = page
  if (activeView.value === 'favorite') {
    fetchFavorites() // 直接使用fetchFavorites获取收藏列表
  } else {
    fetchBookList()
  }
}

// 监听搜索关键词变化，如果清空则重新加载数据
watch(searchKeyword, (newVal) => {
  if (activeView.value === 'all') {
    if (newVal.trim()) {
      // 判断是按标题还是作者搜索
      if (newVal.includes('作者:') || newVal.includes('作者：')) {
        searchType.value = 'author'
        searchKeyword.value = newVal.replace(/作者[:：]\s*/, '')
      } else {
        searchType.value = 'title'
      }
    }
    currentPage.value = 1 // 重置页码
    fetchBookList()
  }
})

// 监听选择的类型变化
watch(selectedType, () => {
  if (activeView.value === 'all') {
    currentPage.value = 1 // 重置页码
    fetchBookList()
  }
})

// 初始化
onMounted(async () => {
  // 同时获取类型和收藏列表
  await Promise.all([
    fetchBookTypes(),
    fetchFavorites()
  ])
  
  // 获取图书列表和推荐图书
  await Promise.all([
    fetchBookList(),
    fetchRecommendBooks()
  ])
})
</script>

<style lang="scss" scoped>
$primary-color: #3a6b35; // 莫奈画作中的翠绿色
$secondary-color: #1b4d3e; // 深绿色
$light-color: #b5d2a7; // 淡绿色
$background-color: #e8f3e4; // 浅绿背景色
$card-color: #ffffff;
$text-color: #1e293b;
$border-color: #88c082; // 绿色边框
$accent-color: #6d9f71; // 橄榄绿

.book-view {
  padding: 20px;
  background-color: $background-color;
  min-height: calc(100vh - 120px);
}

.page-header {
  margin-bottom: 24px;
  position: relative;
  border-left: 4px solid $primary-color;
  padding-left: 16px;
  
  h2 {
    font-size: 28px;
    font-weight: 600;
    margin: 0;
    background: linear-gradient(45deg, $primary-color, $secondary-color);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    position: relative;
    display: inline-block;
    
    &::after {
      content: '';
      position: absolute;
      bottom: -8px;
      left: 0;
      width: 60px;
      height: 3px;
      background: linear-gradient(90deg, $primary-color, $secondary-color);
      border-radius: 3px;
    }
  }
}

.filter-card {
  margin-bottom: 24px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  background-color: $card-color;
  border: none;
  
  :deep(.el-card__body) {
    padding: 20px;
  }
}

.filter-container {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  
  .search-group {
    display: flex;
    flex: 1;
    min-width: 300px;
    
    .search-input {
      flex: 1;
      
      :deep(.el-input__wrapper) {
        border-radius: 8px;
        box-shadow: 0 0 0 1px rgba($primary-color, 0.1);
        
        &:hover, &:focus {
          box-shadow: 0 0 0 1px rgba($primary-color, 0.3);
        }
      }
      
      :deep(.el-input__prefix) {
        color: $primary-color;
      }
      
      :deep(.el-input-group__append) {
        padding: 0;
        
        .el-button {
          border-radius: 0 8px 8px 0;
          margin: 0;
          height: 100%;
          padding: 0 20px;
          border: none;
          background-color: $primary-color;
          color: white;
          
          &:hover {
            background-color: $secondary-color;
          }
        }
      }
    }
  }
  
  .action-group {
    display: flex;
    gap: 10px;
    
    .type-select {
      width: 140px;
      
      :deep(.el-input__wrapper) {
        border-radius: 8px;
        box-shadow: 0 0 0 1px rgba($primary-color, 0.1);
        
        &:hover, &:focus {
          box-shadow: 0 0 0 1px rgba($primary-color, 0.3);
        }
      }
    }
    
    .view-selector {
      :deep(.el-radio-button) {
        margin-right: 0;
        
        &:first-child .el-radio-button__inner {
          border-radius: 8px 0 0 8px;
        }
        
        &:last-child .el-radio-button__inner {
          border-radius: 0 8px 8px 0;
        }
        
        .el-radio-button__inner {
          border-color: rgba($primary-color, 0.2);
          background-color: white;
          color: $text-color;
          transition: all 0.3s;
          
          &:hover {
            color: $primary-color;
            border-color: $primary-color;
          }
        }
        
        &.is-active {
          .el-radio-button__inner {
            background-color: $primary-color;
            border-color: $primary-color;
            color: white;
            box-shadow: 0 0 0 1px $primary-color;
          }
        }
      }
    }
  }
}

.section-title {
  margin-bottom: 20px;
  position: relative;
  border-left: 4px solid $primary-color;
  padding-left: 10px;
  
  h3 {
    font-size: 22px;
    margin: 0 0 5px 0;
    color: $primary-color;
  }
  
  p {
    margin: 0;
    font-size: 14px;
    color: #666;
  }
}

.recommend-section {
  margin-bottom: 30px;
  
  .el-carousel {
    margin-top: 20px;
    
    :deep(.el-carousel__indicators) {
      transform: translateY(15px);
    }
    
    :deep(.el-carousel__button) {
      background-color: $primary-color;
      opacity: 0.5;
      
      &:hover {
        opacity: 0.8;
      }
    }
    
    :deep(.is-active .el-carousel__button) {
      opacity: 1;
    }
  }
  
  .carousel-item {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    border-radius: 8px;
    overflow: hidden;
    position: relative;
    cursor: pointer;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
    
    .carousel-img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      
      :deep(img) {
        object-fit: cover;
        height: 100%;
        width: 100%;
      }
    }
    
    &:hover .carousel-img :deep(img) {
      transform: scale(1.05);
      transition: transform 0.3s;
    }
    
    .carousel-info {
      position: relative;
      z-index: 1;
      background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
      color: white;
      padding: 15px;
      
      h3 {
        margin: 0 0 5px 0;
        font-size: 18px;
      }
      
      p {
        margin: 0;
        opacity: 0.8;
      }
    }
  }
}

.book-list-container {
  min-height: 400px;
}

.books-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
}

.book-card {
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
  border: none;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
    
    .book-actions {
      opacity: 1;
    }
  }
  
  :deep(.el-card__body) {
    padding: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
  }
}

.book-cover {
  position: relative;
  height: 300px;
  overflow: hidden;
  
  .el-image {
    width: 100%;
    height: 100%;
    
    :deep(img) {
      transition: transform 0.3s;
    }
  }
  
  &:hover {
    :deep(.el-image img) {
      transform: scale(1.05);
    }
  }
  
  .image-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #f5f7fa;
    color: #909399;
    font-size: 40px;
  }
  
  .book-type {
    position: absolute;
    top: 10px;
    right: 10px;
    background-color: rgba($primary-color, 0.9);
    color: white;
    padding: 3px 10px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 2;
  }
  
  .book-actions {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    background-color: rgba(0, 0, 0, 0.5);
    opacity: 0;
    transition: opacity 0.3s;
    
    .action-btn {
      background-color: rgba(255, 255, 255, 0.9);
      color: $primary-color;
      font-size: 20px;
      border: none;
      transition: all 0.3s;
      
      &:hover {
        background-color: white;
        color: $secondary-color;
        transform: scale(1.1);
      }
      
      &.read-btn {
        font-size: 24px;
      }
      
      &.favorite-btn {
        color: #e6a23c;
        
        &:hover {
          color: #f56c6c;
        }
      }
    }
  }
}

.book-info {
  padding: 15px;
  flex: 1;
  display: flex;
  flex-direction: column;
  
  .book-title {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 5px;
    color: #333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .book-author {
    font-size: 14px;
    color: #666;
    margin-bottom: 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .book-description {
    font-size: 14px;
    color: #666;
    line-height: 1.5;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
  }
}

.pagination-container {
  margin-top: 30px;
  display: flex;
  justify-content: center;
  padding: 10px 0;
  background-color: $card-color;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  
  :deep(.el-pagination) {
    .el-pagination__total,
    .el-pagination__jump {
      color: #606266;
    }
    
    .el-pagination__sizes .el-select .el-input {
      .el-input__inner {
        border-color: #e4e7ed;
      }
      
      .el-input__wrapper {
        box-shadow: 0 0 0 1px #e4e7ed;
      }
    }
    
    .btn-prev,
    .btn-next,
    .el-pager li {
      background-color: white;
      color: #606266;
      border: 1px solid #e4e7ed;
      transition: all 0.3s;
      
      &:hover:not(.is-disabled) {
        color: $primary-color;
        border-color: $primary-color;
      }
      
      &.is-active {
        background-color: $primary-color;
        color: white;
        border-color: $primary-color;
      }
    }
  }
}

.book-detail-dialog {
  z-index: 2100 !important;
  
  :deep(.el-dialog__header) {
    padding: 20px;
    border-bottom: 1px solid #ebeef5;
    
    .el-dialog__title {
      font-size: 20px;
      font-weight: 600;
      color: $primary-color;
    }
  }
  
  :deep(.el-dialog__body) {
    padding: 20px;
  }
  
  .book-detail-content {
    .book-detail-top {
      display: flex;
      gap: 30px;
      margin-bottom: 30px;
      
      @media (max-width: 768px) {
        flex-direction: column;
        gap: 20px;
      }
      
      .book-detail-cover {
        width: 200px;
        flex-shrink: 0;
        
        .el-image {
          width: 100%;
          height: 300px;
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          overflow: hidden;
        }
        
        @media (max-width: 768px) {
          width: 150px;
          margin: 0 auto;
        }
        
        .image-placeholder-large {
          width: 100%;
          height: 300px;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: #f5f7fa;
          color: #909399;
          font-size: 50px;
          border-radius: 8px;
        }
      }
      
      .book-detail-info {
        flex: 1;
        
        h2 {
          font-size: 24px;
          font-weight: 600;
          margin-top: 0;
          margin-bottom: 15px;
          color: $primary-color;
        }
        
        p {
          margin: 12px 0;
          color: #606266;
          font-size: 16px;
          
          strong {
            color: #333;
            margin-right: 5px;
          }
        }
        
        .book-detail-actions {
          margin-top: 20px;
          display: flex;
          gap: 15px;
          
          .el-button {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 16px;
            padding: 12px 20px;
            border-radius: 8px;
            transition: all 0.3s;
            
            .el-icon {
              font-size: 18px;
            }
            
            &:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            
            &.el-button--primary {
              background-color: $primary-color;
              border-color: $primary-color;
              
              &:hover {
                background-color: $secondary-color;
                border-color: $secondary-color;
              }
            }
          }
        }
      }
    }
    
    .book-detail-description {
      background-color: #f5f9fc;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
      
      h3 {
        margin-top: 0;
        margin-bottom: 15px;
        font-size: 18px;
        color: $primary-color;
        font-weight: 600;
      }
      
      p {
        margin-bottom: 0;
        line-height: 1.6;
        color: #333;
        white-space: pre-line;
      }
    }
    
    .book-chapters {
      h3 {
        font-size: 18px;
        margin-bottom: 15px;
        color: $primary-color;
        font-weight: 600;
      }
      
      :deep(.el-table) {
        border-radius: 8px;
        overflow: hidden;
        
        th.el-table__cell {
          background-color: #f8f9fa;
          color: #606266;
          font-weight: 600;
        }
        
        .el-table__row {
          cursor: pointer;
          transition: background-color 0.2s;
          
          &:hover {
            background-color: rgba($light-color, 0.3);
          }
        }
        
        .el-button {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 8px 15px;
          
          .el-icon {
            font-size: 16px;
          }
        }
      }
    }
  }
}
</style>
