<template>
  <div class="message-list">
    <transition-group name="message-fade" tag="div">
      <el-card 
        v-for="message in messages" 
        :key="message.id" 
        class="message-item"
        :class="{ 'unread': !message.read, [message.type]: true }"
        shadow="hover"
      >
        <template #header>
          <div class="message-header">
            <div class="message-title">
              <el-tag :type="getTagType(message.type)" size="small">
                {{ getTypeText(message.type) }}
              </el-tag>
              <span class="title-text" :class="{ 'bold': !message.read }">
                {{ message.title }}
              </span>
            </div>
            <div class="message-operations">
              <el-tooltip content="标记为已读" placement="top" v-if="!message.read">
                <el-button size="small" type="primary" @click="markAsRead(message.id)">
                  <el-icon class="button-icon"><el-icon-check /></el-icon>
                  <span>已读</span>
                </el-button>
              </el-tooltip>
              <el-tooltip content="删除消息" placement="top">
                <el-button size="small" type="danger" @click="deleteMessage(message.id)">
                  <el-icon class="button-icon"><el-icon-delete /></el-icon>
                  <span>删除</span>
                </el-button>
              </el-tooltip>
            </div>
          </div>
        </template>
        
        <div class="message-content">
          {{ message.content }}
        </div>
        <div class="message-footer">
          <span class="message-time">{{ formatTime(message.time) }}</span>
          <span v-if="message.isSystem" class="message-tag system">系统消息</span>
          <span v-if="message.isPersonal" class="message-tag personal">个人消息</span>
          <span v-if="message.isBroadcast" class="message-tag broadcast">公告</span>
        </div>
      </el-card>
    </transition-group>
    
    <div v-if="messages.length === 0" class="no-message">
      <el-empty description="暂无消息" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

// 接收消息列表作为属性
const props = defineProps({
  messages: {
    type: Array,
    default: () => []
  }
});

// 定义事件
const emit = defineEmits(['read', 'delete']);

// 获取消息类型文本
const getTypeText = (type) => {
  const typeMap = {
    'info': '信息',
    'success': '成功',
    'warning': '警告',
    'error': '错误',
    'system': '系统'
  };
  return typeMap[type] || '消息';
};

// 获取标签类型
const getTagType = (type) => {
  const typeMap = {
    'info': 'info',
    'success': 'success',
    'warning': 'warning',
    'error': 'danger',
    'system': ''
  };
  return typeMap[type] || 'info';
};

// 格式化时间
const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  // 如果是今天的消息，只显示时间
  if (diff < 24 * 60 * 60 * 1000 && 
      date.getDate() === now.getDate() && 
      date.getMonth() === now.getMonth() && 
      date.getFullYear() === now.getFullYear()) {
    return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
  
  // 如果是昨天的消息
  if (diff < 48 * 60 * 60 * 1000 && 
      date.getDate() === now.getDate() - 1 && 
      date.getMonth() === now.getMonth() && 
      date.getFullYear() === now.getFullYear()) {
    return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
  
  // 其他情况显示完整日期
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

// 标记消息为已读
const markAsRead = (messageId) => {
  emit('read', messageId);
};

// 删除消息
const deleteMessage = (messageId) => {
  emit('delete', messageId);
};
</script>

<style scoped>
.message-list {
  width: 100%;
}

.message-item {
  margin-bottom: 15px;
  border-radius: 8px;
  border-left: 4px solid #909399;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.message-item.unread::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #409eff;
  margin: 10px;
}

.message-item.info {
  border-left-color: #409eff;
}

.message-item.success {
  border-left-color: #67c23a;
}

.message-item.warning {
  border-left-color: #e6a23c;
}

.message-item.error {
  border-left-color: #f56c6c;
}

.message-item.system {
  border-left-color: #909399;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.message-operations {
  display: flex;
  gap: 5px;
}

.message-operations .el-button {
  padding: 4px 12px;
  border-radius: 4px;
  transition: all 0.3s;
  border: 1px solid #dcdfe6;
  background-color: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.message-operations .button-icon {
  margin-right: 2px;
  font-size: 14px;
}

.message-operations .el-button--primary {
  color: #409eff;
  border-color: #409eff;
}

.message-operations .el-button--danger {
  color: #f56c6c;
  border-color: #f56c6c;
}

.message-operations .el-button:hover {
  background-color: #ecf5ff;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.message-operations .el-button--primary:hover {
  color: #ffffff;
  background-color: #409eff;
}

.message-operations .el-button--danger:hover {
  color: #ffffff;
  background-color: #f56c6c;
}

.message-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-text {
  font-size: 16px;
  color: #303133;
}

.title-text.bold {
  font-weight: 600;
}

.message-content {
  padding: 10px 0;
  color: #606266;
  line-height: 1.6;
}

.message-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #909399;
  font-size: 13px;
  margin-top: 10px;
}

.message-time {
  color: #909399;
}

.message-tag {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.message-tag.system {
  background-color: #f0f9eb;
  color: #67c23a;
}

.message-tag.personal {
  background-color: #ecf5ff;
  color: #409eff;
}

.message-tag.broadcast {
  background-color: #fdf6ec;
  color: #e6a23c;
}

.no-message {
  padding: 20px;
  text-align: center;
  color: #909399;
}

/* 消息动画 */
.message-fade-enter-active,
.message-fade-leave-active {
  transition: all 0.3s ease;
}

.message-fade-enter-from,
.message-fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style> 