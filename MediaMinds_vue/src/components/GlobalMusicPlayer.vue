<template>
  <div class="global-music-player">
    <MusicPlayer 
      ref="musicPlayerRef"
      :singers="singers"
      :initial-playlist="playlist"
      :initial-song="currentSong"
      @update:playlist="onPlaylistUpdate"
      @update:current-song="onCurrentSongUpdate"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import MusicPlayer from '@/components/MusicPlayer.vue'
import { getAllSingersService } from '@/api/music.js'

// 歌手数据
const singers = ref([])

// 播放状态
const playlist = ref([])
const currentSong = ref(null)

// 子组件引用
const musicPlayerRef = ref(null)

// 组件事件
const emit = defineEmits(['update:playlist'])

// 本地存储键名
const STORAGE_KEYS = {
  PLAYLIST: 'global_music_playlist',
  CURRENT_SONG: 'global_music_current_song'
}

// 从本地存储加载播放列表和当前歌曲
const loadFromStorage = () => {
  try {
    const storedPlaylist = localStorage.getItem(STORAGE_KEYS.PLAYLIST)
    const storedCurrentSong = localStorage.getItem(STORAGE_KEYS.CURRENT_SONG)
    
    if (storedPlaylist) {
      playlist.value = JSON.parse(storedPlaylist)
      // 通知父组件播放列表已更新
      emit('update:playlist', playlist.value)
    } else {
      // 如果没有存储的播放列表，创建一个默认的
      createDefaultPlaylist()
    }
    
    if (storedCurrentSong) {
      currentSong.value = JSON.parse(storedCurrentSong)
    }
  } catch (error) {
    console.error('从本地存储加载播放数据失败:', error)
    // 错误情况下也创建默认播放列表
    createDefaultPlaylist()
  }
}

// 创建默认播放列表
const createDefaultPlaylist = () => {
  // 创建一个默认的播放列表项，确保播放器始终有内容可显示
  const defaultSong = {
    id: 'default-song',
    name: '欢迎使用音乐播放器',
    pic: 'https://mediaminds.oss-cn-beijing.aliyuncs.com/songPic/default.jpg',
    url: '',
    singerId: ''
  }
  
  playlist.value = [defaultSong]
  currentSong.value = defaultSong
  
  // 保存默认播放列表到本地存储
  saveToStorage()
  
  // 通知父组件播放列表已更新
  emit('update:playlist', playlist.value)
  
  console.log('已创建默认播放列表')
}

// 保存到本地存储
const saveToStorage = () => {
  try {
    localStorage.setItem(STORAGE_KEYS.PLAYLIST, JSON.stringify(playlist.value))
    
    if (currentSong.value) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_SONG, JSON.stringify(currentSong.value))
    }
  } catch (error) {
    console.error('保存播放数据到本地存储失败:', error)
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

// 播放列表更新处理
const onPlaylistUpdate = (newPlaylist) => {
  playlist.value = newPlaylist
  saveToStorage()
  // 通知父组件播放列表已更新
  emit('update:playlist', newPlaylist)
}

// 当前歌曲更新处理
const onCurrentSongUpdate = (newSong) => {
  currentSong.value = newSong
  saveToStorage()
}

// 对外暴露的方法
// 播放歌曲
const play = (song) => {
  if (!song) return
  
  // 修复URL格式问题
  if (song.url && song.url.includes('oss.console.aliyun.com')) {
    const songName = song.url.split('/').pop()
    song.url = `https://mediaminds.oss-cn-beijing.aliyuncs.com/song/${songName}`
  }
  
  if (musicPlayerRef.value) {
    musicPlayerRef.value.play(song)
  }
}

// 添加到播放列表
const addToPlaylist = (song) => {
  if (!song) return
  
  // 修复URL格式问题
  if (song.url && song.url.includes('oss.console.aliyun.com')) {
    const songName = song.url.split('/').pop()
    song.url = `https://mediaminds.oss-cn-beijing.aliyuncs.com/song/${songName}`
  }
  
  if (musicPlayerRef.value) {
    musicPlayerRef.value.addToPlaylist(song)
  }
}

// 播放整个列表
const playList = (songs) => {
  if (!songs || !songs.length) return
  
  // 先清空当前播放列表
  playlist.value = []
  
  // 添加所有歌曲并修复URL
  songs.forEach(song => {
    // 修复URL格式问题
    if (song.url && song.url.includes('oss.console.aliyun.com')) {
      const songName = song.url.split('/').pop()
      song.url = `https://mediaminds.oss-cn-beijing.aliyuncs.com/song/${songName}`
    }
    
    playlist.value.push(song)
  })
  
  // 播放第一首
  if (songs.length > 0 && musicPlayerRef.value) {
    play(songs[0])
  }
  
  // 保存到本地存储
  saveToStorage()
  
  // 通知父组件播放列表已更新
  emit('update:playlist', playlist.value)
}

// 初始化
onMounted(() => {
  // 加载歌手数据
  fetchSingers()
  
  // 从本地存储加载播放列表和当前歌曲
  loadFromStorage()
})

// 暴露方法给父组件
defineExpose({
  play,
  addToPlaylist,
  playList
})
</script>

<style scoped>
.global-music-player {
  /* 确保播放器在所有页面上可见 */
  z-index: 9999;
}
</style> 