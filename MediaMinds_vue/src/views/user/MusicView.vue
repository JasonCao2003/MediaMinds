<script setup>
import { ref, onMounted, reactive, inject, onBeforeUnmount, watch } from 'vue'
import { ElMessage, ElLoading, ElMessageBox } from 'element-plus'
import { cancelAllRequests } from '@/utils/request.js'
import { 
  getAllSongsService, 
  getSongByNameService,
  getSongsBySingerNameService,
  getAllSingersService,
  getListSongBySongListIdService,
  getAllSongListsService,
  getSongListByLikeTitleService,
  getSongListByStyleService,
  getRankBySongListIdService,
  addCommentService,
  getCommentsService,
  likeCommentService,
  addCollectionService,
  getUserCollectionsService,
  deleteCollectionService,
  addRankService,
  getSongsBySingerIdService,
  getRecommendedSongListsService,
  getRecommendedSongsService,
  getLyricsAnalysisService
} from '@/api/music.js'
import useUserInfoStore from '@/stores/userInfo.js'
import { userInfoService } from '@/api/user.js'
import { useTokenStore } from '@/stores/token.js'

// 导入 Element Plus 图标
import {
  Search,
  VideoPlay,
  VideoPause,
  Plus,
  Star,
  StarFilled,
  ChatDotRound,
  Picture,
  Headset,
  Back,
  Right,
  Position,
  Cpu,
  Pointer
} from '@element-plus/icons-vue'

// 获取全局音乐播放器
const globalMusicPlayer = inject('globalMusicPlayer')
// 获取用户信息
const userInfoStore = useUserInfoStore()
// 获取token
const tokenStore = useTokenStore()

// 音乐数据
const songs = ref([])
const singers = ref([])
const songLists = ref([])
const collections = ref([])
// 收藏的歌曲和歌单
const favoriteSongs = ref([])
const favoriteSongLists = ref([])
// 推荐歌单
const recommendedSongLists = ref([])
// 推荐歌曲
const recommendedSongs = ref([])

// 加载状态
const loading = ref(false)

// 搜索关键词
const searchKeyword = ref('')

// 歌手筛选
const artistFilter = ref('')

// 排序方式
const sortOrder = ref('latest')

// 已筛选的音乐
const filteredMusic = ref([])

// 播放状态
const playingId = ref(null)

// 当前活动标签
const activeTab = ref('recommended')

// 分页参数
const songPagination = reactive({
  currentPage: 1,
  pageSize: 6,
  total: 0
})

const songListPagination = reactive({
  currentPage: 1,
  pageSize: 14,
  total: 0
})

const favoriteSongPagination = reactive({
  currentPage: 1,
  pageSize: 12,
  total: 0
})

const favoriteSongListPagination = reactive({
  currentPage: 1,
  pageSize: 12,
  total: 0
})

// 评论相关
const comments = ref([])
const commentForm = reactive({
  content: '',
  songId: null,
  songListId: null,
  type: '0' // 0-歌曲评论 1-歌单评论
})

// 评分表单
const ratingForm = reactive({
  songListId: null,
  score: 0
})

// 对话框控制
const commentDialogVisible = ref(false)
const ratingDialogVisible = ref(false)
const currentItem = ref(null)

// 自定义图标路径
const iconPaths = {
  play: "M512 85.333333C277.333333 85.333333 85.333333 277.333333 85.333333 512s192 426.666667 426.666667 426.666667 426.666667-192 426.666667-426.666667S746.666667 85.333333 512 85.333333z m0 810.666667C307.2 896 138.666667 727.466667 138.666667 522.666667S307.2 149.333333 512 149.333333s373.333333 168.533333 373.333333 373.333334-168.533333 373.333333-373.333333 373.333333z m-85.333333-576v341.333333l256-170.666666z",
  pause: "M512 85.333333C277.333333 85.333333 85.333333 277.333333 85.333333 512s192 426.666667 426.666667 426.666667 426.666667-192 426.666667-426.666667S746.666667 85.333333 512 85.333333z m0 810.666667C307.2 896 138.666667 727.466667 138.666667 522.666667S307.2 149.333333 512 149.333333s373.333333 168.533333 373.333333 373.333334-168.533333 373.333333-373.333333 373.333333z m-106.666667-597.333333h85.333334v341.333333h-85.333334V298.666667z m149.333334 0h85.333333v341.333333h-85.333333V298.666667z",
  addToList: "M810.666667 554.666667h-213.333334v213.333333h-85.333333v-213.333333H298.666667v-85.333334h213.333333V256h85.333333v213.333333h213.333334v85.333334zM512 85.333333C277.333333 85.333333 85.333333 277.333333 85.333333 512s192 426.666667 426.666667 426.666667 426.666667-192 426.666667-426.666667S746.666667 85.333333 512 85.333333z m0 810.666667C307.2 896 138.666667 727.466667 138.666667 522.666667S307.2 149.333333 512 149.333333s373.333333 168.533333 373.333333 373.333334-168.533333 373.333333-373.333333 373.333333z",
  comment: "M512 149.333333c233.6 0 426.666667 172.8 426.666667 384 0 132.266667-85.333333 249.6-213.333334 320-18.033333 8.533333-29.866667 26.666667-29.866666 46.933334 0 4.266667-4.266667 4.266667-4.266667 8.533333h-8.533333c-4.266667 0-8.533333 0-8.533334-4.266667l-4.266666-4.266666s0-4.266667-4.266667-4.266667c-21.333333-25.6-17.066667-55.466667 0-85.333333 0-4.266667 4.266667-4.266667 0-8.533334C512 832 384 746.666667 384 618.666667c0-26.666667 17.066667-42.666667 42.666667-42.666667s42.666667 17.066667 42.666666 42.666667c0 98.133333 106.666667 170.666667 217.6 128 8.533333-4.266667 17.066667 0 21.333334 8.533333s0 17.066667-8.533334 21.333333c-46.933333 21.333333-98.133333 29.866667-145.066666 25.6 115.2-42.666667 196.266667-153.6 196.266666-277.333333 0-166.4-157.866667-298.666667-354.133333-298.666667s-354.133333 132.266667-354.133333 298.666667c0 81.066667 34.133333 157.866667 93.866666 213.333333 8.533333 8.533333 8.533333 17.066667 0 25.6-8.533333 8.533333-17.066667 8.533333-25.6 0-68.266667-64-106.666667-153.6-106.666666-243.2 0-213.333333 192-384 426.666666-384z m85.333333 384c25.6 0 42.666667 17.066667 42.666667 42.666667s-17.066667 42.666667-42.666667 42.666667-42.666667-17.066667-42.666666-42.666667 17.066667-42.666667 42.666666-42.666667z m-170.666666 0c25.6 0 42.666667 17.066667 42.666666 42.666667s-17.066667 42.666667-42.666666 42.666667-42.666667-17.066667-42.666667-42.666667 17.066667-42.666667 42.666667-42.666667z",
  starFilled: "M908.1 353.1l-253.9-36.9L540.7 86.1c-3.1-6.3-8.2-11.4-14.5-14.5-15.8-7.8-35-1.3-42.9 14.5L369.8 316.2l-253.9 36.9c-7 1-13.4 4.3-18.3 9.3a32.05 32.05 0 0 0 .6 45.3l183.7 179.1-43.4 252.9a31.95 31.95 0 0 0 46.4 33.7L512 754l227.1 119.4c6.2 3.3 13.4 4.4 20.3 3.2 17.4-3 29.1-19.5 26.1-36.9l-43.4-252.9 183.7-179.1c5-4.9 8.3-11.3 9.3-18.3 2.7-17.5-9.5-33.7-27-36.3z",
  starOutline: "M908.1 353.1l-253.9-36.9L540.7 86.1c-3.1-6.3-8.2-11.4-14.5-14.5-15.8-7.8-35-1.3-42.9 14.5L369.8 316.2l-253.9 36.9c-7 1-13.4 4.3-18.3 9.3a32.05 32.05 0 0 0 .6 45.3l183.7 179.1-43.4 252.9a31.95 31.95 0 0 0 46.4 33.7L512 754l227.1 119.4c6.2 3.3 13.4 4.4 20.3 3.2 17.4-3 29.1-19.5 26.1-36.9l-43.4-252.9 183.7-179.1c5-4.9 8.3-11.3 9.3-18.3 2.7-17.5-9.5-33.7-27-36.3zM664.8 561.6l36.1 210.3L512 672.7 323.1 772l36.1-210.3-152.8-149L417.6 382 512 190.7 606.4 382l211.2 30.7-152.8 148.9z",
  rate: "M908.1 353.1l-253.9-36.9L540.7 86.1c-3.1-6.3-8.2-11.4-14.5-14.5-15.8-7.8-35-1.3-42.9 14.5L369.8 316.2l-253.9 36.9c-7 1-13.4 4.3-18.3 9.3a32.05 32.05 0 0 0 .6 45.3l183.7 179.1-43.4 252.9a31.95 31.95 0 0 0 46.4 33.7L512 754l227.1 119.4c6.2 3.3 13.4 4.4 20.3 3.2 17.4-3 29.1-19.5 26.1-36.9l-43.4-252.9 183.7-179.1c5-4.9 8.3-11.3 9.3-18.3 2.7-17.5-9.5-33.7-27-36.3z",
  music: "M848 359.3c0-10.7-4.3-21.3-11.7-29.3L557.3 49c-8-8-19.3-11.7-29.3-11.7-0.7 0-1.3 0-2 0.7H205.3c-18.7 0-32 14-32 32v874.7c0 18 13.3 32 32 32h597.3c18.7 0 32-14 32-32V360c0-0.7 0-0.7 0-0.7zM557.3 99l268 268H557.3V99zM768 913.3H213.3V110.3h276v288c0 18 13.3 32 32 32h246.7v483z M610.7 507.7c-4.7-2.7-10-4-15.3-4-0.7 0-1.3 0-2 0.7l-264 44c-12 1.3-20.7 12-20.7 24v264c-13.3-9.3-29.3-14.7-46.7-14.7-44 0-80 36-80 80s36 80 80 80 80-36 80-80V605l200-33.3v164c-13.3-9.3-29.3-14.7-46.7-14.7-44 0-80 36-80 80s36 80 80 80 80-36 80-80V532c0-10-5.3-19.3-14.7-24.3z"
}

// 获取所有歌曲
const fetchSongs = async () => {
  loading.value = true
  try {
    const params = {
      pageNum: songPagination.currentPage,
      pageSize: songPagination.pageSize
    }
    
    const res = await getAllSongsService(params)
    if (res.code === 200) {
      // 确保解析返回的records数据
      songs.value = res.data.records || []
      // 更新分页信息
      songPagination.total = res.data.total || 0
      songPagination.currentPage = res.data.current || 1
      songPagination.pageSize = res.data.size || 12
      filterAndSortMusic()
    }
  } catch (error) {
    ElMessage.error('获取歌曲失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 获取所有歌手
const fetchSingers = async () => {
  try {
    const params = {
      pageNum: 1,
      pageSize: 100 // 默认获取100个歌手
    }
    const res = await getAllSingersService(params)
    if (res.code === 200) {
      singers.value = res.data.records || []
    }
  } catch (error) {
    console.error('获取歌手失败', error)
  }
}

// 获取所有歌单
const fetchSongLists = async () => {
  try {
    const params = {
      pageNum: songListPagination.currentPage,
      pageSize: songListPagination.pageSize
    }
    
    const res = await getAllSongListsService(params)
    if (res.code === 200) {
      songLists.value = res.data.records || []
      // 更新分页信息
      songListPagination.total = res.data.total || 0
      songListPagination.currentPage = res.data.current || 1
      songListPagination.pageSize = res.data.size || 12
    }
  } catch (error) {
    console.error('获取歌单失败', error)
  }
}

// 获取用户收藏
const fetchUserCollections = async () => {
  try {
    const params = {
      pageNum: 1,
      pageSize: 100 // 尝试一次性获取更多的收藏记录
    }
    const res = await getUserCollectionsService(params)
    if (res.code === 200 && res.data) {
      collections.value = res.data.records || []
      // 处理收藏的歌曲和歌单
      filterFavorites()
      
      // 更新收藏分页信息
      if (res.data.records && res.data.records.length > 0) {
        favoriteSongPagination.total = res.data.total || 0
        favoriteSongPagination.currentPage = res.data.current || 1
        favoriteSongPagination.pageSize = res.data.size || 12
        
        favoriteSongListPagination.total = res.data.total || 0
        favoriteSongListPagination.currentPage = res.data.current || 1
        favoriteSongListPagination.pageSize = res.data.size || 12
      }
    }
  } catch (error) {
    console.error('获取收藏失败', error)
  }
}

// 过滤收藏的歌曲和歌单
const filterFavorites = () => {
  // 获取收藏的歌曲
  const songIds = collections.value
    .filter(item => item.type === '0')
    .map(item => item.songId)
  
  // 如果API直接返回了歌曲信息，则使用API返回的数据
  if (collections.value.length > 0 && collections.value[0].id && collections.value[0].name) {
    favoriteSongs.value = collections.value.map(song => {
      // 处理图片URL中可能存在的换行符
      if (song.pic && song.pic.includes('\n')) {
        song.pic = song.pic.replace(/\n/g, '');
      }
      return song;
    });
  } else {
    // 否则按原来的方式过滤
    favoriteSongs.value = songs.value.filter(song => songIds.includes(song.id))
  }
  
  // 获取收藏的歌单
  const songListIds = collections.value
    .filter(item => item.type === '1')
    .map(item => item.songListId)
  
  favoriteSongLists.value = songLists.value.filter(songList => songListIds.includes(songList.id))
}

// 筛选和排序音乐
const filterAndSortMusic = () => {
  // 先筛选
  let result = songs.value
  
  // 排序
  switch (sortOrder.value) {
    case 'latest':
      result = result.sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
      break
    case 'name':
      result = result.sort((a, b) => a.name.localeCompare(b.name))
      break
    case 'singer':
      result = result.sort((a, b) => {
        const singerA = singers.value.find(singer => singer.id === a.singerId)?.name || ''
        const singerB = singers.value.find(singer => singer.id === b.singerId)?.name || ''
        return singerA.localeCompare(singerB)
      })
      break
  }
  
  filteredMusic.value = result
}

// 搜索处理
const handleSearch = () => {
  songPagination.currentPage = 1
  
  if (searchKeyword.value) {
    // 根据关键词搜索歌曲名和歌手名
    searchSongsByKeyword()
  } else if (artistFilter.value) {
    // 根据歌手ID搜索
    searchSongsBySinger()
  } else {
    // 重新获取所有歌曲
    fetchSongs()
  }
}

// 监听搜索关键词和歌手筛选变化，实现实时搜索
watch([() => searchKeyword.value, () => artistFilter.value], () => {
  handleSearch()
})

// 根据关键词搜索歌曲和歌手
const searchSongsByKeyword = async () => {
  loading.value = true
  try {
    const params = {
      pageNum: songPagination.currentPage,
      pageSize: songPagination.pageSize
    }
    
    // 先尝试按歌曲名搜索
    let songsByName = [];
    try {
      const res = await getSongByNameService(searchKeyword.value, params);
      if (res.code === 200) {
        songsByName = res.data.records || [];
        // 更新分页信息
        songPagination.total = res.data.total || 0;
        songPagination.currentPage = res.data.current || 1;
        songPagination.pageSize = res.data.size || 12;
      }
    } catch (error) {
      console.warn('按歌曲名搜索未找到结果', error);
      // 不显示错误提示
    }
    
    // 再尝试按歌手名搜索
    let songsBySinger = []
    try {
      const singerRes = await getSongsBySingerNameService(searchKeyword.value, params)
      if (singerRes.code === 200) {
        songsBySinger = singerRes.data.records || []
      }
    } catch (error) {
      console.warn('按歌手名搜索未找到结果', error)
      // 继续使用歌曲名的搜索结果
    }
    
    // 合并结果并去重
    if (songsBySinger.length > 0) {
      // 通过ID去重
      const songIds = new Set(songsByName.map(song => song.id))
      const uniqueSongsBySinger = songsBySinger.filter(song => !songIds.has(song.id))
      
      // 合并结果
      songs.value = [...songsByName, ...uniqueSongsBySinger]
      
      // 更新总数（保守估计）
      songPagination.total = Math.max(songPagination.total, songs.value.length)
    } else {
      songs.value = songsByName
    }
    
    filterAndSortMusic()
  } catch (error) {
    console.error('搜索歌曲失败', error)
    // 不显示错误提示弹窗
  } finally {
    loading.value = false
  }
}

// 根据歌手搜索
const searchSongsBySinger = async () => {
  loading.value = true
  try {
    const params = {
      pageNum: songPagination.currentPage,
      pageSize: songPagination.pageSize
    }
    
    const res = await getSongsBySingerNameService(artistFilter.value, params)
    if (res.code === 200) {
      songs.value = res.data.records || []
      // 更新分页信息
      songPagination.total = res.data.total || 0
      songPagination.currentPage = res.data.current || 1
      songPagination.pageSize = res.data.size || 12
      filterAndSortMusic()
    }
  } catch (error) {
    console.error('搜索歌手失败', error)
    // 不显示错误提示弹窗
  } finally {
    loading.value = false
  }
}

// 重置筛选
const resetFilter = () => {
  searchKeyword.value = ''
  artistFilter.value = ''
  sortOrder.value = 'latest'
  songPagination.currentPage = 1
  fetchSongs()
}

// 播放音乐
const playMusic = (song) => {
  // 更健壮的用户检查 - 只要角色是user就允许播放
  if (!userInfoStore.isUser()) {
    ElMessage.warning('只有普通用户可以使用音乐播放功能')
    return
  }

  if (globalMusicPlayer) {
    playingId.value = song.id
    // 调用全局播放器的播放方法
    globalMusicPlayer.play(song)
    ElMessage.success(`正在播放《${song.name}》`)
  }
}

// 添加到播放列表
const addToPlaylist = (song, event) => {
  if (event) event.stopPropagation()
  
  // 更健壮的用户检查 - 只要角色是user就允许添加
  if (!userInfoStore.isUser()) {
    ElMessage.warning('只有普通用户可以使用音乐播放功能')
    return
  }
  
  if (globalMusicPlayer) {
    globalMusicPlayer.addToPlaylist(song)
  }
}

// 添加到收藏
const addToFavorite = async (song, event) => {
  if (event) event.stopPropagation()
  
  try {
    // 检查是否已收藏
    const isCollected = collections.value.some(item => 
      item.type === '0' && item.songId === song.id
    )
    
    if (isCollected) {
      ElMessage.warning(`《${song.name}》已在收藏中`)
      return
    }
    
    const res = await addCollectionService('0', song.id)
    if (res.code === 200) {
      ElMessage.success(`《${song.name}》已添加到收藏`)
      fetchUserCollections() // 刷新收藏列表
    }
  } catch (error) {
    ElMessage.error('收藏失败')
    console.error(error)
  }
}

// 取消收藏
const cancelFavorite = async (song, event) => {
  if (event) event.stopPropagation()
  
  try {
    const res = await deleteCollectionService(song.id)
    if (res.code === 200) {
      ElMessage.success(`已取消收藏《${song.name}》`)
      fetchUserCollections() // 刷新收藏列表
    }
  } catch (error) {
    ElMessage.error('取消收藏失败')
    console.error(error)
  }
}

// 判断是否已收藏
const isCollected = (song) => {
  return collections.value.some(item => 
    item.type === '0' && item.songId === song.id
  )
}

// 判断歌单是否已收藏
const isSongListCollected = (songList) => {
  return collections.value.some(item => 
    item.type === '1' && item.songListId === songList.id
  )
}

// 添加歌单到收藏
const addSongListToFavorite = async (songList, event) => {
  if (event) event.stopPropagation()
  
  try {
    // 检查是否已收藏
    if (isSongListCollected(songList)) {
      ElMessage.warning(`《${songList.title}》已在收藏中`)
      return
    }
    
    const res = await addCollectionService('1', null, songList.id)
    if (res.code === 200) {
      ElMessage.success(`歌单《${songList.title}》已添加到收藏`)
      fetchUserCollections() // 刷新收藏列表
    }
  } catch (error) {
    ElMessage.error('收藏失败')
    console.error(error)
  }
}

// 打开评论对话框
const openCommentDialog = (item, type) => {
  currentItem.value = item
  commentForm.content = ''
  commentForm.songId = type === '0' ? item.id : null
  commentForm.songListId = type === '1' ? item.id : null
  commentForm.type = type
  commentDialogVisible.value = true
  
  // 加载评论
  fetchComments(type, item.id)
}

// 获取评论
const fetchComments = async (type, id) => {
  try {
    const params = {}
    if (type === '0') {
      params.songId = id
    } else {
      params.songListId = id
    }
    
    const res = await getCommentsService(params)
    if (res.code === 200) {
      // 处理返回的评论数据，获取records数组
      comments.value = res.data.records || []
    }
  } catch (error) {
    console.error('获取评论失败', error)
  }
}

// 提交评论
const submitComment = async () => {
  if (!commentForm.content.trim()) {
    ElMessage.warning('评论内容不能为空')
    return
  }
  
  try {
    const res = await addCommentService(commentForm)
    if (res.code === 200) {
      ElMessage.success('评论发布成功')
      commentForm.content = ''
      // 重新加载评论
      fetchComments(commentForm.type, commentForm.type === '0' ? commentForm.songId : commentForm.songListId)
    }
  } catch (error) {
    ElMessage.error('评论发布失败')
    console.error(error)
  }
}

// 点赞评论
const likeComment = async (comment) => {
  try {
    const res = await likeCommentService(comment.id)
    if (res.code === 200) {
      ElMessage.success('点赞成功')
      // 更新评论列表中的点赞数
      comment.up = (comment.up || 0) + 1
    }
  } catch (error) {
    ElMessage.error('点赞失败')
    console.error(error)
  }
}

// 打开评分对话框
const openRatingDialog = (songList) => {
  currentItem.value = songList
  ratingForm.songListId = songList.id
  ratingForm.score = 5 // 默认5分
  ratingDialogVisible.value = true
  
  // 获取该歌单的当前评分
  fetchSongListRating(songList.id)
}

// 获取歌单评分
const fetchSongListRating = async (songListId) => {
  try {
    const res = await getRankBySongListIdService(songListId)
    if (res.code === 200 && res.data) {
      // 显示当前评分
      ElMessage.info(`当前歌单评分：${res.data}`)
    }
  } catch (error) {
    console.error('获取歌单评分失败', error)
  }
}

// 提交评分
const submitRating = async () => {
  try {
    const res = await addRankService(ratingForm)
    if (res.code === 200) {
      ElMessage.success('评分提交成功')
      ratingDialogVisible.value = false
    }
  } catch (error) {
    ElMessage.error('评分提交失败')
    console.error(error)
  }
}

// 获取歌手名称
const getSingerName = (singerId) => {
  const singer = singers.value.find(item => item.id === singerId)
  return singer ? singer.name : '未知歌手'
}

// 处理查看歌单
const handleViewSongList = async (songList) => {
  // 声明loading变量在函数作用域内
  let loadingInstance = null;
  
  try {
    // 显示加载中
    loadingInstance = ElLoading.service({
      text: '加载歌单歌曲...',
      background: 'rgba(0, 0, 0, 0.7)'
    });
    
    // 获取歌单中的歌曲
    const res = await getListSongBySongListIdService(songList.id);
    
    // 关闭加载
    if (loadingInstance) {
      loadingInstance.close();
      loadingInstance = null;
    }
    
    if (res.code === 200) {
      // 处理新的API返回的分页数据结构
      const songListSongs = res.data.records || [];
      
      // 如果songListSongs不是数组，提供警告
      if (songListSongs.length === 0) {
        console.warn('歌单中没有歌曲:', songList.title);
      }
      
      // 存储歌单歌曲供播放使用
      window.currentSongListSongs = songListSongs;
      
      ElMessage.success(`正在查看歌单《${songList.title}》`);
      
      // 限制显示的歌曲数量，避免渲染过多内容导致卡顿
      const maxDisplaySongs = 20;
      const displaySongs = songListSongs.slice(0, maxDisplaySongs);
      const remainingSongsCount = Math.max(0, songListSongs.length - maxDisplaySongs);
      
      // 构建HTML内容
      const htmlContent = `
        <div class="songlist-detail">
          <div class="songlist-header">
            <div class="songlist-cover-container">
              <img src="${formatImageUrl(songList.pic)}" alt="封面" class="songlist-cover-img">
            </div>
            <div class="songlist-info">
              <h3>${songList.title}</h3>
              <p>风格: ${songList.style}</p>
              <p>${songList.introduction || '暂无简介'}</p>
              <div class="songlist-actions">
                <button class="play-all-btn" onclick="window.playSongList('${songList.id}')">
                  <i class="fa fa-play-circle"></i> 播放全部
                </button>
              </div>
            </div>
          </div>
          <div class="songlist-songs">
            <h4>歌曲列表 (${songListSongs.length}首)</h4>
            <ul>
              ${displaySongs.map((song, index) => `
                <li>
                  <span class="song-index">${index+1}</span>
                  <span class="song-name">${song.name}</span>
                  <span class="song-singer">${getSingerName(song.singerId)}</span>
                </li>
              `).join('')}
              ${remainingSongsCount > 0 ? `<li class="more-songs">...还有${remainingSongsCount}首歌曲</li>` : ''}
            </ul>
          </div>
        </div>
      `;
      
      // 使用Promise处理对话框，捕获取消操作
      try {
        await ElMessageBox.alert(htmlContent, '歌单详情', {
          dangerouslyUseHTMLString: true,
          confirmButtonText: '关闭',
          closeOnClickModal: true,
          closeOnPressEscape: true,
          showClose: true,
          callback: () => {} // 空回调，避免未处理的promise
        });
      } catch (dialogError) {
        // 这里可以优雅地处理dialog取消
        console.log('歌单对话框已关闭');
      }
    } else {
      ElMessage.warning('该歌单暂无歌曲');
    }
  } catch (error) {
    console.error('获取歌单歌曲失败', error);
    ElMessage.error('获取歌单歌曲失败');
  } finally {
    // 确保加载状态一定会关闭
    if (loadingInstance) {
      loadingInstance.close();
    }
  }
}

// 播放整个歌单
const playSongList = (songListId) => {
  if (!userInfoStore.isUser()) {
    ElMessage.warning('只有普通用户可以使用音乐播放功能')
    return
  }

  if (window.currentSongListSongs && window.currentSongListSongs.length > 0) {
    // 添加歌单所有歌曲到播放列表
    if (globalMusicPlayer) {
      globalMusicPlayer.playList(window.currentSongListSongs)
      playingId.value = window.currentSongListSongs[0].id
      ElMessage.success(`已添加歌单所有歌曲到播放列表`)
    }
  }
}

// 将playSongList挂载到window对象，以便在对话框中调用
window.playSongList = playSongList

// 处理歌曲页码变化
const handleSongPageChange = (val) => {
  songPagination.currentPage = val
  // 重新获取歌曲数据
  if (searchKeyword.value) {
    // 搜索状态下的分页
    searchSongsByKeyword()
  } else if (artistFilter.value) {
    // 按歌手筛选状态下的分页
    searchSongsBySinger()
  } else {
    // 正常状态下的分页
    fetchSongs()
  }
}

// 处理歌单页码变化
const handleSongListPageChange = (val) => {
  songListPagination.currentPage = val
  fetchSongLists()
}

// 处理收藏歌曲页码变化
const handleFavoriteSongPageChange = (val) => {
  favoriteSongPagination.currentPage = val
  // 重新获取收藏
  fetchUserCollections()
}

// 处理收藏歌单页码变化
const handleFavoriteSongListPageChange = (val) => {
  favoriteSongListPagination.currentPage = val
  // 重新获取收藏
  fetchUserCollections()
}

// 获取推荐歌单
const fetchRecommendedSongLists = async () => {
  loading.value = true
  try {
    const res = await getRecommendedSongListsService()
    if (res.code === 200) {
      recommendedSongLists.value = res.data || []
    }
  } catch (error) {
    ElMessage.error('获取推荐歌单失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 获取推荐歌曲
const fetchRecommendedSongs = async () => {
  loading.value = true
  try {
    const res = await getRecommendedSongsService()
    if (res.code === 200) {
      recommendedSongs.value = res.data || []
    }
  } catch (error) {
    ElMessage.error('获取推荐歌曲失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 初始化数据
const initData = () => {
  // 获取歌手列表 - 通常比较少，可以一次性获取
  fetchSingers()
  
  // 加载当前标签页需要的数据
  loadCurrentTabData()
}

// 根据当前标签页加载数据
const loadCurrentTabData = () => {
  // 重置所有分页为第一页
  switch(activeTab.value) {
    case 'recommended':
      fetchRecommendedSongLists()
      fetchRecommendedSongs()
      break
    case 'songs':
      // 重置歌曲分页
      songPagination.currentPage = 1
      fetchSongs()
      break
    case 'playlists':
      // 重置歌单分页
      songListPagination.currentPage = 1
      fetchSongLists()
      break
    case 'favorite-songs':
    case 'favorite-playlists':
      // 重置收藏分页
      favoriteSongPagination.currentPage = 1
      favoriteSongListPagination.currentPage = 1
      fetchUserCollections()
      break
  }
}

// 监听标签页切换
const handleTabChange = (tab) => {
  // 切换标签页时只加载当前页面需要的数据
  loadCurrentTabData()
}

// 重新获取用户信息
const refreshUserInfo = async () => {
  if (tokenStore.getToken()) {
    try {
      const result = await userInfoService()
      if (result.code === 200) {
        userInfoStore.setInfo(result.data)
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
  }
}

// 修复图片显示（处理换行符）
const formatImageUrl = (url) => {
  if (!url) return '';
  return url.replace(/\n/g, '');
}

onMounted(async () => {
  // 如果用户信息不完整，重新获取用户信息
  if (tokenStore.getToken() && (!userInfoStore.isLoggedIn() || !userInfoStore.role)) {
    await refreshUserInfo()
  }
  
  initData()
  window.playSongList = playSongList
})

// 组件卸载前取消所有挂起的请求
onBeforeUnmount(() => {
  cancelAllRequests()
})

// AI分析相关
const showAIDialog = ref(false)
const aiAnalysisLoading = ref(false)
const aiAnalysisResult = ref('')
const aiAnalysisError = ref('')

// AI分析歌词
const analyzeLyrics = async (song, event) => {
  if (event) event.stopPropagation()
  
  if (!song.lyric) {
    ElMessage.warning('该歌曲没有歌词可供分析')
    return
  }
  
  showAIDialog.value = true
  aiAnalysisLoading.value = true
  aiAnalysisResult.value = ''
  aiAnalysisError.value = ''
  
  try {
    // 处理歌词内容，去除时间标签
    const lyricText = song.lyric
    const processedLyrics = lyricText.replace(/\[\d{2}:\d{2}\.\d{2}\]/g, '').trim()
    
    // 使用当前用户名作为userId
    const userId = localStorage.getItem('username') || '用户'
    
    // 调用API获取AI分析结果
    const res = await getLyricsAnalysisService(processedLyrics, userId)
    
    if (res.code === 200) {
      aiAnalysisResult.value = res.data
    } else {
      aiAnalysisError.value = res.msg || '获取歌词分析失败'
    }
  } catch (error) {
    console.error('获取歌词分析错误', error)
    aiAnalysisError.value = '获取歌词分析出错：' + (error.message || '未知错误')
  } finally {
    aiAnalysisLoading.value = false
  }
}
</script>

<template>
  <div class="music-view">
    <div class="page-header">
      <h2>音乐浏览</h2>
    </div>
    
    <!-- 标签页 -->
    <el-tabs v-model="activeTab" class="tab-container" @tab-change="handleTabChange">
      <!-- 推荐歌单标签页 -->
      <el-tab-pane label="推荐" name="recommended">
        <div class="recommended-container">
          <!-- 推荐歌曲部分 -->
          <el-row>
            <el-col :span="24">
              <div class="section-title">
                <h3>为你推荐</h3>
                <p>根据您的听歌偏好推荐的歌曲</p>
              </div>
            </el-col>
          </el-row>
          
          <div class="recommended-songs-section" v-loading="loading">
            <el-empty v-if="recommendedSongs.length === 0" description="暂无推荐歌曲" />
            
            <el-table
              v-else
              :data="recommendedSongs"
              style="width: 100%"
              @row-click="playMusic"
              :row-class-name="(row) => playingId === row.row.id ? 'playing-row' : ''"
              class="recommended-songs-table"
            >
              <el-table-column width="120" fixed>
                <template #default="scope">
                  <el-button
                    circle
                    type="text"
                    size="small"
                    @click.stop="playMusic(scope.row)"
                    title="播放"
                  >
                    <el-icon>
                      <component :is="playingId !== scope.row.id ? VideoPlay : VideoPause" />
                    </el-icon>
                  </el-button>
                  
                  <el-button
                    circle
                    type="text"
                    size="small"
                    @click.stop="addToPlaylist(scope.row, $event)"
                    title="添加到播放列表"
                  >
                    <el-icon><Plus /></el-icon>
                  </el-button>
                </template>
              </el-table-column>
              
              <el-table-column label="封面" width="100" fixed>
                <template #default="scope">
                  <el-image
                    :src="formatImageUrl(scope.row.pic)" 
                    fit="cover"
                    style="width: 60px; height: 60px; border-radius: 8px;"
                    :preview-src-list="[formatImageUrl(scope.row.pic)]"
                    :initial-index="0"
                    lazy
                  >
                    <template #error>
                      <div class="image-placeholder">
                        <el-icon><Headset /></el-icon>
                      </div>
                    </template>
                  </el-image>
                </template>
              </el-table-column>
              
              <el-table-column prop="name" label="歌曲名称" />
              
              <el-table-column label="歌手">
                <template #default="scope">
                  {{ getSingerName(scope.row.singerId) }}
                </template>
              </el-table-column>
              
              <el-table-column width="150">
                <template #default="scope">
                  <el-button
                    circle
                    type="primary"
                    size="small"
                    @click.stop="openCommentDialog(scope.row, '0')"
                    title="查看评论"
                  >
                    <el-icon><ChatDotRound /></el-icon>
                  </el-button>
                  
                  <el-button
                    v-if="!isCollected(scope.row)"
                    circle
                    type="info"
                    size="small"
                    @click.stop="addToFavorite(scope.row, $event)"
                    title="添加到收藏"
                  >
                    <el-icon><Star /></el-icon>
                  </el-button>
                  
                  <el-button
                    v-else
                    circle
                    type="warning"
                    size="small"
                    @click.stop="cancelFavorite(scope.row, $event)"
                    title="取消收藏"
                  >
                    <el-icon><StarFilled /></el-icon>
                  </el-button>
                  
                  <el-button
                    circle
                    type="success"
                    size="small"
                    @click.stop="analyzeLyrics(scope.row, $event)"
                    title="AI分析歌词"
                    :disabled="!scope.row.lyric"
                  >
                    <el-icon><Cpu /></el-icon>
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
          
          <!-- 精选推荐歌单部分 -->
          <el-row>
            <el-col :span="24">
              <div class="section-title">
                <h3>精选歌单</h3>
                <p>根据你的喜好推荐的精选歌单</p>
              </div>
            </el-col>
          </el-row>
          
          <!-- 推荐歌单展示 -->
          <div class="recommended-section" v-loading="loading">
            <el-empty v-if="recommendedSongLists.length === 0" description="暂无推荐歌单" />
            
            <div v-else class="songlist-grid">
              <el-card 
                v-for="songList in recommendedSongLists" 
                :key="songList.id" 
                shadow="hover" 
                class="songlist-card recommended-card"
                @click="handleViewSongList(songList)"
              >
                <div class="songlist-cover">
                  <el-image 
                    :src="formatImageUrl(songList.pic)" 
                    fit="cover"
                    :preview-src-list="[formatImageUrl(songList.pic)]"
                    lazy
                  >
                    <template #error>
                      <div class="image-placeholder">
                        <el-icon><Picture /></el-icon>
                      </div>
                    </template>
                  </el-image>
                  
                  <div class="recommended-tag">推荐</div>
                  
                  <div class="songlist-actions">
                    <el-button
                      circle
                      class="action-btn"
                      @click.stop="openCommentDialog(songList, '1')"
                      title="查看评论"
                    >
                      <el-icon><ChatDotRound /></el-icon>
                    </el-button>
                    
                    <el-button
                      v-if="!isSongListCollected(songList)"
                      circle
                      class="action-btn"
                      @click.stop="addSongListToFavorite(songList, $event)"
                      title="添加到收藏"
                    >
                      <el-icon><Star /></el-icon>
                    </el-button>
                    
                    <el-button
                      v-else
                      circle
                      class="action-btn favorite-btn"
                      @click.stop="cancelFavorite(songList, $event)"
                      title="取消收藏"
                    >
                      <el-icon><StarFilled /></el-icon>
                    </el-button>
                    
                    <el-button
                      circle
                      class="action-btn"
                      @click.stop="openRatingDialog(songList)"
                      title="评分"
                    >
                      <el-icon><Star /></el-icon>
                    </el-button>
                  </div>
                </div>
                
                <div class="songlist-info">
                  <h3 class="songlist-title">{{ songList.title }}</h3>
                  <p class="songlist-style">{{ songList.style }}</p>
                  <p class="songlist-desc">{{ songList.introduction }}</p>
                </div>
              </el-card>
            </div>
          </div>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="歌曲" name="songs">
        <!-- 搜索和筛选 -->
        <el-card class="filter-card">
          <div class="filter-container">
            <div class="search-group">
              <el-input
                v-model="searchKeyword"
                placeholder="输入歌曲名或歌手名"
                clearable
                class="search-input"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
                <template #append>
                  <el-button @click="resetFilter">清空</el-button>
                </template>
              </el-input>
            </div>
            
            <div class="action-group">
              <el-select
                v-model="artistFilter"
                placeholder="歌手筛选"
                clearable
                @change="handleSearch"
                class="filter-select"
              >
                <el-option
                  v-for="singer in singers"
                  :key="singer.id"
                  :label="singer.name"
                  :value="singer.id"
                />
              </el-select>
              
              <el-select
                v-model="sortOrder"
                placeholder="排序方式"
                @change="handleSearch"
                class="sort-select"
              >
                <el-option label="最新上传" value="latest" />
                <el-option label="歌名排序" value="name" />
                <el-option label="歌手排序" value="singer" />
              </el-select>
              
              <el-button @click="resetFilter" type="info" plain>重置</el-button>
            </div>
          </div>
        </el-card>
        
        <!-- 音乐列表 -->
        <div class="music-container">
          <el-empty v-if="filteredMusic.length === 0" description="没有找到符合条件的音乐" />
          
          <el-table
            v-else
            :data="filteredMusic"
            style="width: 100%"
            @row-click="playMusic"
            :row-class-name="(row) => playingId === row.row.id ? 'playing-row' : ''"
            v-loading="loading"
            height="550"
          >
            <el-table-column width="120" fixed>
              <template #default="scope">
                <el-button
                  circle
                  type="text"
                  size="small"
                  @click.stop="playMusic(scope.row)"
                  title="播放"
                >
                  <el-icon>
                    <component :is="playingId !== scope.row.id ? VideoPlay : VideoPause" />
                  </el-icon>
                </el-button>
                
                <el-button
                  circle
                  type="text"
                  size="small"
                  @click.stop="addToPlaylist(scope.row, $event)"
                  title="添加到播放列表"
                >
                  <el-icon><Plus /></el-icon>
                </el-button>
              </template>
            </el-table-column>
            
            <el-table-column label="封面" width="100" fixed>
              <template #default="scope">
                <el-image
                  :src="formatImageUrl(scope.row.pic)" 
                  fit="cover"
                  style="width: 60px; height: 60px; border-radius: 8px;"
                  :preview-src-list="[formatImageUrl(scope.row.pic)]"
                  :initial-index="0"
                  lazy
                >
                  <template #error>
                    <div class="image-placeholder">
                      <el-icon><Headset /></el-icon>
                    </div>
                  </template>
                </el-image>
              </template>
            </el-table-column>
            
            <el-table-column prop="name" label="歌曲名称" />
            
            <el-table-column label="歌手">
              <template #default="scope">
                {{ getSingerName(scope.row.singerId) }}
              </template>
            </el-table-column>
            
            <el-table-column width="150">
              <template #default="scope">
                <el-button
                  circle
                  type="primary"
                  size="small"
                  @click.stop="openCommentDialog(scope.row, '0')"
                  title="查看评论"
                >
                  <el-icon><ChatDotRound /></el-icon>
                </el-button>
                
                <el-button
                  v-if="!isCollected(scope.row)"
                  circle
                  type="info"
                  size="small"
                  @click.stop="addToFavorite(scope.row, $event)"
                  title="添加到收藏"
                >
                  <el-icon><Star /></el-icon>
                </el-button>
                
                <el-button
                  v-else
                  circle
                  type="warning"
                  size="small"
                  @click.stop="cancelFavorite(scope.row, $event)"
                  title="取消收藏"
                >
                  <el-icon><StarFilled /></el-icon>
                </el-button>
                
                <el-button
                  circle
                  type="success"
                  size="small"
                  @click.stop="analyzeLyrics(scope.row, $event)"
                  title="AI分析歌词"
                  :disabled="!scope.row.lyric"
                >
                  <el-icon><Cpu /></el-icon>
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <!-- 歌曲分页器 -->
          <div class="pagination-container">
            <el-pagination
              v-model:current-page="songPagination.currentPage"
              :page-size="songPagination.pageSize"
              :total="songPagination.total"
              @current-change="handleSongPageChange"
              layout="prev, pager, next, jumper"
              background
            />
          </div>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="歌单" name="playlists">
        <!-- 歌单列表 -->
        <div class="songlist-container">
          <div class="songlist-grid">
            <el-card 
              v-for="songList in songLists" 
              :key="songList.id" 
              shadow="hover" 
              class="songlist-card"
              @click="handleViewSongList(songList)"
            >
              <div class="songlist-cover">
                <el-image 
                  :src="formatImageUrl(songList.pic)" 
                  fit="cover"
                  :preview-src-list="[formatImageUrl(songList.pic)]"
                  lazy
                >
                  <template #error>
                    <div class="image-placeholder">
                      <el-icon><Picture /></el-icon>
                    </div>
                  </template>
                </el-image>
                
                <div class="songlist-actions">
                  <el-button
                    circle
                    class="action-btn"
                    @click.stop="openCommentDialog(songList, '1')"
                    title="查看评论"
                  >
                    <el-icon><ChatDotRound /></el-icon>
                  </el-button>
                  
                  <el-button
                    v-if="!isSongListCollected(songList)"
                    circle
                    class="action-btn"
                    @click.stop="addSongListToFavorite(songList, $event)"
                    title="添加到收藏"
                  >
                    <el-icon><Star /></el-icon>
                  </el-button>
                  
                  <el-button
                    v-else
                    circle
                    class="action-btn favorite-btn"
                    @click.stop="cancelFavorite(songList, $event)"
                    title="取消收藏"
                  >
                    <el-icon><StarFilled /></el-icon>
                  </el-button>
                  
                  <el-button
                    circle
                    class="action-btn"
                    @click.stop="openRatingDialog(songList)"
                    title="评分"
                  >
                    <el-icon><Star /></el-icon>
                  </el-button>
                </div>
              </div>
              
              <div class="songlist-info">
                <h3 class="songlist-title">{{ songList.title }}</h3>
                <p class="songlist-style">{{ songList.style }}</p>
              </div>
            </el-card>
          </div>
          
          <!-- 歌单分页器 -->
          <div class="pagination-container">
            <el-pagination
              v-model:current-page="songListPagination.currentPage"
              :page-size="songListPagination.pageSize"
              :total="songListPagination.total"
              @current-change="handleSongListPageChange"
              layout="prev, pager, next, jumper"
              background
            />
          </div>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="收藏的歌曲" name="favorite-songs">
        <!-- 收藏的歌曲 -->
        <div class="music-container">
          <el-empty v-if="favoriteSongs.length === 0" description="您还没有收藏歌曲" />
          
          <template v-else>
            <el-table
              :data="favoriteSongs"
              style="width: 100%"
              @row-click="playMusic"
              :row-class-name="(row) => playingId === row.row.id ? 'playing-row' : ''"
              height="550"
            >
              <el-table-column width="120">
                <template #default="scope">
                  <el-button
                    circle
                    type="text"
                    size="small"
                    @click.stop="playMusic(scope.row)"
                    title="播放"
                  >
                    <el-icon>
                      <component :is="playingId !== scope.row.id ? VideoPlay : VideoPause" />
                    </el-icon>
                  </el-button>
                  
                  <el-button
                    circle
                    type="text"
                    size="small"
                    @click.stop="addToPlaylist(scope.row, $event)"
                    title="添加到播放列表"
                  >
                    <el-icon><Plus /></el-icon>
                  </el-button>
                </template>
              </el-table-column>
              
              <el-table-column label="封面" width="100">
                <template #default="scope">
                  <el-image
                    :src="formatImageUrl(scope.row.pic)" 
                    fit="cover"
                    style="width: 60px; height: 60px; border-radius: 8px;"
                    :preview-src-list="[formatImageUrl(scope.row.pic)]"
                    :initial-index="0"
                    lazy
                  >
                    <template #error>
                      <div class="image-placeholder">
                        <el-icon><Headset /></el-icon>
                      </div>
                    </template>
                  </el-image>
                </template>
              </el-table-column>
              
              <el-table-column prop="name" label="歌曲名称" />
              
              <el-table-column label="歌手">
                <template #default="scope">
                  {{ getSingerName(scope.row.singerId) }}
                </template>
              </el-table-column>
              
              <el-table-column width="150">
                <template #default="scope">
                  <el-button
                    circle
                    type="primary"
                    size="small"
                    @click.stop="openCommentDialog(scope.row, '0')"
                    title="查看评论"
                  >
                    <el-icon><ChatDotRound /></el-icon>
                  </el-button>
                  
                  <el-button
                    circle
                    type="warning"
                    size="small"
                    @click.stop="cancelFavorite(scope.row, $event)"
                    title="取消收藏"
                  >
                    <el-icon><StarFilled /></el-icon>
                  </el-button>
                  
                  <el-button
                    circle
                    type="success"
                    size="small"
                    @click.stop="analyzeLyrics(scope.row, $event)"
                    title="AI分析歌词"
                    :disabled="!scope.row.lyric"
                  >
                    <el-icon><Cpu /></el-icon>
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
            
            <!-- 收藏歌曲分页器 -->
            <div class="pagination-container">
              <el-pagination
                v-model:current-page="favoriteSongPagination.currentPage"
                :page-size="favoriteSongPagination.pageSize"
                :total="favoriteSongPagination.total"
                @current-change="handleFavoriteSongPageChange"
                layout="prev, pager, next, jumper"
                background
              />
            </div>
          </template>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="收藏的歌单" name="favorite-playlists">
        <!-- 收藏的歌单列表 -->
        <div class="songlist-container">
          <el-empty v-if="favoriteSongLists.length === 0" description="您还没有收藏歌单" />
          
          <template v-else>
            <div class="songlist-grid">
              <el-card 
                v-for="songList in favoriteSongLists" 
                :key="songList.id" 
                shadow="hover" 
                class="songlist-card"
                @click="handleViewSongList(songList)"
              >
                <div class="songlist-cover">
                  <el-image 
                    :src="formatImageUrl(songList.pic)" 
                    fit="cover"
                    :preview-src-list="[formatImageUrl(songList.pic)]"
                    lazy
                  >
                    <template #error>
                      <div class="image-placeholder">
                        <el-icon><Picture /></el-icon>
                      </div>
                    </template>
                  </el-image>
                  
                  <div class="songlist-actions">
                    <el-button
                      circle
                      class="action-btn"
                      @click.stop="openCommentDialog(songList, '1')"
                      title="查看评论"
                    >
                      <el-icon><ChatDotRound /></el-icon>
                    </el-button>
                    
                    <el-button
                      circle
                      class="action-btn favorite-btn"
                      @click.stop="cancelFavorite(songList, $event)"
                      title="取消收藏"
                    >
                      <el-icon><StarFilled /></el-icon>
                    </el-button>
                    
                    <el-button
                      circle
                      class="action-btn"
                      @click.stop="openRatingDialog(songList)"
                      title="评分"
                    >
                      <el-icon><Star /></el-icon>
                    </el-button>
                  </div>
                </div>
                
                <div class="songlist-info">
                  <h3 class="songlist-title">{{ songList.title }}</h3>
                  <p class="songlist-style">{{ songList.style }}</p>
                </div>
              </el-card>
            </div>
            
            <!-- 收藏歌单分页器 -->
            <div class="pagination-container">
              <el-pagination
                v-model:current-page="favoriteSongListPagination.currentPage"
                :page-size="favoriteSongListPagination.pageSize"
                :total="favoriteSongListPagination.total"
                @current-change="handleFavoriteSongListPageChange"
                layout="prev, pager, next, jumper"
                background
              />
            </div>
          </template>
        </div>
      </el-tab-pane>
    </el-tabs>
    
    <!-- 评论对话框 -->
    <el-dialog
      v-model="commentDialogVisible"
      :title="`${commentForm.type === '0' ? '歌曲' : '歌单'}评论 - ${currentItem?.name || currentItem?.title}`"
      width="600px"
      @close="() => { cancelAllRequests(); }"
    >
      <div class="comment-list" v-loading="loading">
        <el-empty v-if="comments.length === 0" description="暂无评论" />
        
        <div v-else class="comment-item" v-for="comment in comments" :key="comment.id">
          <div class="comment-header">
            <span class="comment-user">用户ID: {{ comment.userId }}</span>
            <span class="comment-time">{{ new Date(comment.createTime).toLocaleString() }}</span>
          </div>
          <div class="comment-content">{{ comment.content }}</div>
          <div class="comment-actions">
            <el-button type="text" size="small" @click="likeComment(comment)" class="like-button">
              <el-icon><Star /></el-icon> 
              <span class="like-count">{{ comment.up || 0 }}</span>
            </el-button>
          </div>
        </div>
      </div>
      
      <div class="comment-form">
        <el-input
          v-model="commentForm.content"
          type="textarea"
          :rows="3"
          placeholder="发表您的评论..."
        />
        <el-button type="primary" @click="submitComment" style="margin-top: 10px;">发表评论</el-button>
      </div>
    </el-dialog>
    
    <!-- 评分对话框 -->
    <el-dialog
      v-model="ratingDialogVisible"
      :title="`歌单评分 - ${currentItem?.title}`"
      width="400px"
      @close="() => { cancelAllRequests(); }"
    >
      <div class="rating-form">
        <el-rate
          v-model="ratingForm.score"
          :max="10"
          show-score
          text-color="#ff9900"
          score-template="{value}"
        />
        <div class="rating-actions">
          <el-button type="primary" @click="submitRating">提交评分</el-button>
        </div>
      </div>
    </el-dialog>
    
    <!-- AI分析对话框 -->
    <el-dialog
      v-model="showAIDialog"
      title="歌词AI情感分析"
      width="80%"
      class="ai-analysis-dialog"
      :close-on-click-modal="false"
      :destroy-on-close="true"
      append-to-body
    >
      <div v-if="aiAnalysisLoading" class="ai-loading-container">
        <div class="loader"></div>
        <p>AI正在分析歌词内容，请稍候...</p>
      </div>
      <div v-else-if="aiAnalysisError" class="ai-error-container">
        <el-icon class="error-icon"><WarningFilled /></el-icon>
        <p>{{ aiAnalysisError }}</p>
        <el-button type="primary" @click="analyzeLyrics">重试</el-button>
      </div>
      <div v-else-if="aiAnalysisResult" class="ai-analysis-content">
        <el-scrollbar height="60vh">
          <div class="analysis-section">
            <div class="analysis-text" v-html="aiAnalysisResult.replace(/\n/g, '<br>')"></div>
          </div>
        </el-scrollbar>
      </div>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
$primary-color: #1976d2; // 主蓝色
$secondary-color: #0d47a1; // 深蓝色
$light-color: #bbdefb; // 淡蓝色
$background-color: #e3f2fd; // 浅蓝背景色
$card-color: #ffffff;
$text-color: #1e293b;
$border-color: #64b5f6; // 蓝色边框
$accent-color: #2196f3; // 亮蓝色调

.music-view {
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

.tab-container {
  margin-top: 20px;
  
  :deep(.el-tabs__nav-wrap::after) {
    background-color: $border-color;
    height: 2px;
  }
  
  :deep(.el-tabs__item) {
    color: $text-color;
    font-size: 16px;
    font-weight: 500;
    padding: 0 20px;
    height: 40px;
    line-height: 40px;
    
    &.is-active {
      color: $primary-color;
    }
    
    &:hover {
      color: $secondary-color;
    }
  }
  
  :deep(.el-tabs__active-bar) {
    background-color: $primary-color;
    height: 3px;
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
    
    .filter-select,
    .sort-select {
      width: 120px;
      
      :deep(.el-input__wrapper) {
        border-radius: 8px;
        box-shadow: 0 0 0 1px rgba($primary-color, 0.1);
        
        &:hover, &:focus {
          box-shadow: 0 0 0 1px rgba($primary-color, 0.3);
        }
      }
    }
    
    .el-button {
      border-radius: 8px;
      
      &:hover {
        border-color: $primary-color;
        color: $primary-color;
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

.recommended-container {
  padding: 10px 0;
}

.recommended-section,
.recommended-songs-section {
  margin-bottom: 30px;
}

.music-container,
.songlist-container {
  margin-top: 20px;
  min-height: 400px;
}

.songlist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
}

.songlist-card {
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
    
    .songlist-actions {
      opacity: 1;
    }
  }
  
  :deep(.el-card__body) {
    padding: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  
  &.recommended-card {
    position: relative;
  }
}

.songlist-cover {
  position: relative;
  height: 180px;
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
    font-size: 30px;
  }
  
  .songlist-actions {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    background-color: rgba(0, 0, 0, 0.5);
    opacity: 0;
    transition: opacity 0.3s;
    
    .action-btn {
      background-color: rgba(255, 255, 255, 0.9);
      color: $primary-color;
      border: none;
      transition: all 0.3s;
      
      &:hover {
        background-color: white;
        color: $secondary-color;
        transform: scale(1.1);
      }
      
      &.favorite-btn {
        color: #e6a23c;
        
        &:hover {
          color: #f56c6c;
        }
      }
    }
  }
  
  .recommended-tag {
    position: absolute;
    top: 10px;
    right: 10px;
    background-color: $accent-color;
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 2;
  }
}

.songlist-info {
  padding: 15px;
  flex: 1;
  display: flex;
  flex-direction: column;
  
  .songlist-title {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 5px;
    color: #333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .songlist-style {
    font-size: 14px;
    color: #666;
    margin-bottom: 5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .songlist-desc {
    font-size: 12px;
    color: #999;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    margin-bottom: 0;
  }
}

.image-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 60px;
  height: 60px;
  background-color: #f5f7fa;
  color: #909399;
  font-size: 24px;
}

.playing-row {
  background-color: rgba($light-color, 0.5) !important;
}

.pagination-container {
  margin-top: 30px;
  display: flex;
  justify-content: center;
  padding: 10px 0;
  background-color: $card-color;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

/* 评论样式 */
.comment-list {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 20px;
  border-radius: 8px;
  background-color: #f9f9f9;
  padding: 10px;
}

.comment-item {
  padding: 12px;
  border-bottom: 1px solid #ebeef5;
  background-color: white;
  margin-bottom: 10px;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.comment-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  
  .comment-user {
    color: $primary-color;
    font-weight: 500;
  }
  
  .comment-time {
    color: #909399;
  }
}

.comment-content {
  margin: 8px 0;
  line-height: 1.5;
  word-break: break-word;
}

.comment-actions {
  display: flex;
  justify-content: flex-end;
  
  .like-button {
    display: flex;
    align-items: center;
    gap: 4px;
    
    .el-icon {
      color: #F56C6C;
      font-size: 16px;
    }
    
    &:hover .el-icon {
      transform: scale(1.2);
      transition: transform 0.2s;
    }
    
    .like-count {
      font-weight: 500;
    }
  }
}

.comment-form {
  .el-input {
    margin-bottom: 10px;
  }
  
  .el-button {
    width: 120px;
  }
}

/* 评分对话框 */
.rating-form {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  
  .el-rate {
    margin-bottom: 20px;
    font-size: 24px;
  }
  
  .rating-actions {
    width: 100%;
    display: flex;
    justify-content: center;
  }
}

/* AI分析对话框 */
.ai-analysis-dialog {
  z-index: 2100 !important;
}

.ai-loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  
  .loader {
    width: 48px;
    height: 48px;
    border: 4px solid #e4e7ed;
    border-top-color: $primary-color;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }
  
  p {
    color: #666;
    font-size: 16px;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.ai-error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 0;
  
  .error-icon {
    font-size: 48px;
    color: #f56c6c;
    margin-bottom: 16px;
  }
  
  p {
    color: #f56c6c;
    font-size: 16px;
    margin-bottom: 20px;
    text-align: center;
  }
}

.ai-analysis-content {
  padding: 20px;
}

.analysis-section {
  margin-bottom: 24px;
}

.analysis-text {
  line-height: 1.8;
  white-space: pre-line;
  color: #333;
}

/* 歌单详情样式 */
:deep(.songlist-detail) {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', SimSun, sans-serif;
  
  .songlist-header {
    display: flex;
    margin-bottom: 20px;
    
    .songlist-cover-container {
      width: 120px;
      height: 120px;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      flex-shrink: 0;
    }
    
    .songlist-cover-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    
    .songlist-info {
      margin-left: 20px;
      flex: 1;
      
      h3 {
        margin-top: 0;
        margin-bottom: 10px;
        font-size: 20px;
        color: $primary-color;
        font-weight: 600;
      }
      
      p {
        color: #606266;
        margin: 8px 0;
        font-size: 14px;
      }
      
      .songlist-actions {
        margin-top: 15px;
        
        .play-all-btn {
          background: linear-gradient(135deg, $primary-color, $secondary-color);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 14px;
          transition: all 0.3s;
          
          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba($primary-color, 0.3);
          }
        }
      }
    }
  }
  
  .songlist-songs {
    h4 {
      margin-top: 0;
      padding-bottom: 10px;
      border-bottom: 1px solid $border-color;
      font-size: 16px;
      color: $primary-color;
    }
    
    ul {
      padding: 0;
      list-style: none;
      max-height: 300px;
      overflow-y: auto;
      
      li {
        padding: 10px;
        border-bottom: 1px solid #EBEEF5;
        display: flex;
        align-items: center;
        transition: background-color 0.2s;
        border-radius: 4px;
        
        &:hover {
          background-color: rgba($light-color, 0.3);
        }
        
        &:last-child {
          border-bottom: none;
        }
        
        .song-index {
          width: 30px;
          text-align: center;
          color: #909399;
          font-size: 14px;
        }
        
        .song-name {
          flex: 1;
          padding: 0 10px;
          color: #303133;
          font-size: 14px;
          font-weight: 500;
        }
        
        .song-singer {
          width: 120px;
          text-align: right;
          color: #909399;
          font-size: 14px;
        }
        
        &.more-songs {
          color: #909399;
          text-align: center;
          font-style: italic;
          padding: 10px 0;
        }
      }
    }
  }
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
      background-color: rgba($light-color, 0.3) !important;
    }
  }
  
  .el-button {
    margin: 0 2px;
    padding: 8px;
    transition: all 0.3s ease;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }
    
    &.is-circle {
      padding: 8px;
    }
  }
}

:deep(.el-pagination) {
  .el-pagination__total,
  .el-pagination__jump {
    color: #606266;
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
</style> 