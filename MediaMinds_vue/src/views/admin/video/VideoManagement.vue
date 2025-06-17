<template>
  <div class="video-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>视频内容管理</span>
        </div>
      </template>
      
      <el-tabs v-model="activeTab" @tab-click="handleTabClick">
        <el-tab-pane label="电影管理" name="movie">
          <movie-manage v-if="activeTab === 'movie'" />
        </el-tab-pane>
        <el-tab-pane label="分类管理" name="category">
          <category-manage v-if="activeTab === 'category'" />
        </el-tab-pane>
        <el-tab-pane label="标签管理" name="tag">
          <tag-manage v-if="activeTab === 'tag'" />
        </el-tab-pane>
        <el-tab-pane label="评论管理" name="comment">
          <comment-manage v-if="activeTab === 'comment'" />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MovieManage from './MovieManage.vue'
import CategoryManage from './CategoryManage.vue'
import TagManage from './TagManage.vue'
import CommentManage from './CommentManage.vue'

// 当前激活的标签页
const activeTab = ref('movie')

// 标签页切换处理
const handleTabClick = (tab) => {
  console.log('当前选中标签页:', tab.props.name)
}
</script>

<style scoped lang="scss">
.video-management {
  padding: 20px;
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}
</style> 