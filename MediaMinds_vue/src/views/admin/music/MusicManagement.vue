<template>
  <div class="music-management">
    <div class="page-header">
      <h2>音乐内容管理</h2>
      <p class="sub-title">管理平台的音乐相关内容</p>
    </div>

    <el-tabs type="border-card" v-model="activeTab">
      <el-tab-pane label="歌曲管理" name="songs">
        <song-management v-if="activeTab === 'songs'" />
      </el-tab-pane>
      
      <el-tab-pane label="歌手管理" name="singers">
        <singer-management v-if="activeTab === 'singers'" />
      </el-tab-pane>
      
      <el-tab-pane label="歌单管理" name="songlists">
        <song-list-management v-if="activeTab === 'songlists'" />
      </el-tab-pane>
      
      <el-tab-pane label="评论管理" name="comments">
        <comment-management v-if="activeTab === 'comments'" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import SongManagement from './SongManagement.vue'
import SingerManagement from './SingerManagement.vue'
import SongListManagement from './SongListManagement.vue'
import CommentManagement from './CommentManagement.vue'

const activeTab = ref('songs')

// 在组件挂载时，确保各个子组件也已预加载完成
onMounted(() => {
  console.log('MusicManagement component mounted successfully')
})
</script>

<style scoped lang="scss">
.music-management {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
  h2 {
    font-size: 24px;
    font-weight: 600;
    color: #333;
    margin-bottom: 8px;
  }
  
  .sub-title {
    font-size: 14px;
    color: #666;
    margin: 0;
  }
}

:deep(.el-tabs__content) {
  padding: 0;
  overflow: visible;
}
</style> 