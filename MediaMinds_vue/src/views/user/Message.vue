<template>
  <div class="message-page">
    <div class="page-header">
      <h2>消息中心</h2>
      <p class="subtitle">查看您收到的通知和消息</p>
    </div>

    <el-row :gutter="20" v-if="messages.length > 0">
      <el-col :span="24">
        <div class="message-actions">
          <el-button type="primary" @click="markAllAsRead" :disabled="!hasUnread">
            全部标为已读
          </el-button>
          <el-button @click="clearMessages" type="danger" plain>
            清空消息
          </el-button>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="24">
        <el-tabs v-model="activeTab" class="message-tabs">
          <el-tab-pane label="全部消息" name="all">
            <message-list :messages="filteredMessages" @read="markAsRead" @delete="deleteMessage" />
          </el-tab-pane>
          <el-tab-pane label="未读消息" name="unread">
            <message-list :messages="unreadMessages" @read="markAsRead" @delete="deleteMessage" />
          </el-tab-pane>
          <el-tab-pane label="系统通知" name="system">
            <message-list :messages="systemMessages" @read="markAsRead" @delete="deleteMessage" />
          </el-tab-pane>
          <el-tab-pane label="个人消息" name="personal">
            <message-list :messages="personalMessages" @read="markAsRead" @delete="deleteMessage" />
          </el-tab-pane>
        </el-tabs>
      </el-col>
    </el-row>

    <el-empty v-if="filteredMessages.length === 0" description="暂无消息" :image-size="200" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ElMessageBox, ElMessage } from 'element-plus';
import websocketService from '@/utils/websocketService';
import MessageList from '@/components/MessageList.vue';

// 消息数组
const messages = ref([]);
// 当前激活的标签页
const activeTab = ref('all');
// 消息ID计数器
let messageIdCounter = 0;

// 过滤后的消息列表
const filteredMessages = computed(() => {
  if (activeTab.value === 'all') {
    return messages.value;
  } else if (activeTab.value === 'unread') {
    return messages.value.filter(msg => !msg.read);
  } else if (activeTab.value === 'system') {
    return messages.value.filter(msg => msg.isSystem);
  } else if (activeTab.value === 'personal') {
    return messages.value.filter(msg => msg.isPersonal);
  }
  return messages.value;
});

// 未读消息
const unreadMessages = computed(() => {
  return messages.value.filter(msg => !msg.read);
});

// 系统消息
const systemMessages = computed(() => {
  return messages.value.filter(msg => msg.isSystem);
});

// 个人消息
const personalMessages = computed(() => {
  return messages.value.filter(msg => msg.isPersonal);
});

// 是否有未读消息
const hasUnread = computed(() => {
  return messages.value.some(msg => !msg.read);
});

// 添加消息
const addMessage = (message) => {
  // 如果没有ID，生成一个
  if (!message.id) {
    message.id = ++messageIdCounter;
  }

  // 确保message.title存在
  if (!message.title && message.type) {
    const titleMap = {
      'info': '信息通知',
      'success': '成功通知',
      'warning': '警告通知',
      'error': '错误通知',
      'system': '系统通知'
    };
    message.title = titleMap[message.type] || '通知';
  }

  // 将消息添加到数组前端
  messages.value.unshift(message);
};

// WebSocket消息处理函数
const handleWebSocketMessage = (message) => {
  // 调试输出原始消息
  console.log('消息中心收到原始消息:', message);

  // 针对Kafka消息特殊处理
  if (['NEW_CONTENT', 'COMMENT_REPLY', 'COLLECT_SUCCESS', 'RECOMMENDATION', 'SYSTEM_NOTICE'].includes(message.type)) {
    console.log('检测到Kafka消息类型:', message.type);

    // 强制设置添加到消息中心标志
    message.addToMessageCenter = true;

    // 如果没有内容，根据类型设置默认内容
    if (!message.content && !message.message) {
      const defaultContents = {
        'NEW_CONTENT': '系统有新内容更新，快去查看吧',
        'COMMENT_REPLY': '有人回复了您的评论',
        'COLLECT_SUCCESS': '内容已成功添加到您的收藏',
        'RECOMMENDATION': '系统为您推荐了新内容',
        'SYSTEM_NOTICE': '您有一条系统通知'
      };
      message.content = defaultContents[message.type];
      message.message = message.content;
    }
  }

  // 如果消息已被处理或明确指定不添加到消息中心，则跳过
  if (message.addToMessageCenter === false) {
    console.log('消息被标记为不添加到消息中心');
    return;
  }

  // 处理特定的Kafka消息类型
  const messageType = message.type || 'info';
  let messageTitle = message.title || '系统通知';
  let isSystem = message.isSystem || messageType === 'system';
  let isPersonal = message.isPersonal || false;
  let isBroadcast = message.isBroadcast || false;

  // 根据消息类型设置更友好的标题和分类标志
  if (typeof message.type === 'string' && !message.title) {
    // 处理Kafka特定消息类型
    switch (message.type) {
      case 'NEW_CONTENT':
        messageTitle = '新内容通知';
        isSystem = true;
        isBroadcast = true;
        break;
      case 'COMMENT_REPLY':
        messageTitle = '评论回复通知';
        isPersonal = true;
        isBroadcast = false;
        break;
      case 'COLLECT_SUCCESS':
        messageTitle = '收藏成功';
        isPersonal = true;
        isBroadcast = false;
        break;
      case 'RECOMMENDATION':
        messageTitle = '为您推荐';
        isSystem = true;
        isBroadcast = true;
        break;
      case 'SYSTEM_NOTICE':
        messageTitle = '系统通知';
        isSystem = true;
        isBroadcast = true;
        break;
    }
  }

  // 确保系统公告和广播消息显示在消息中心
  if (isBroadcast) {
    isSystem = true; // 所有广播消息也标记为系统消息
  }

  // 创建新消息对象
  const newMessage = {
    id: ++messageIdCounter,
    title: messageTitle,
    content: message.content || message.message || '收到新消息',
    type: messageType,
    time: message.time || new Date().getTime(),
    read: false,
    isSystem: isSystem,
    isPersonal: isPersonal,
    isBroadcast: isBroadcast
  };

  // 调试输出将添加到消息中心的消息
  console.log('将添加到消息中心的消息:', newMessage);

  // 添加消息到消息中心
  addMessage(newMessage);

  // 标记消息已添加到消息中心
  message.addToMessageCenter = true;

  // 保存消息到本地存储
  saveMessages();
};

// 将消息标记为已读
const markAsRead = (messageId) => {
  const index = messages.value.findIndex(msg => msg.id === messageId);
  if (index !== -1) {
    messages.value[index].read = true;
  }
};

// 将所有消息标记为已读
const markAllAsRead = () => {
  messages.value.forEach(msg => {
    msg.read = true;
  });
  ElMessage.success('已将所有消息标记为已读');
};

// 删除消息
const deleteMessage = (messageId) => {
  const index = messages.value.findIndex(msg => msg.id === messageId);
  if (index !== -1) {
    messages.value.splice(index, 1);
  }
};

// 清空所有消息
const clearMessages = () => {
  ElMessageBox.confirm('确定要清空所有消息吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    messages.value = [];
    ElMessage.success('已清空所有消息');
    saveMessages();
  }).catch(() => {
    // 用户取消操作
  });
};

// 从本地存储加载消息
const loadMessages = () => {
  try {
    const savedMessages = localStorage.getItem('user_messages');
    if (savedMessages) {
      messages.value = JSON.parse(savedMessages);

      // 更新计数器
      messageIdCounter = messages.value.length > 0 ?
        Math.max(...messages.value.map(msg => msg.id), 0) : 0;
    }
  } catch (error) {
    console.error('加载消息失败:', error);
  }
};

// 保存消息到本地存储
const saveMessages = () => {
  try {
    localStorage.setItem('user_messages', JSON.stringify(messages.value));
  } catch (error) {
    console.error('保存消息失败:', error);
  }
};

onMounted(() => {
  // 加载已存在的消息
  loadMessages();

  // 注册WebSocket消息处理函数
  websocketService.onMessage(handleWebSocketMessage);

  // 确保WebSocket已连接
  websocketService.connect();
});

onUnmounted(() => {
  // 取消注册WebSocket消息处理函数
  websocketService.offMessage(handleWebSocketMessage);

  // 保存消息到本地存储
  saveMessages();
});
</script>

<style scoped>
.message-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.subtitle {
  margin-top: 8px;
  color: #606266;
  font-size: 14px;
}

.message-actions {
  margin-bottom: 20px;
  display: flex;
  justify-content: flex-end;
}

.message-tabs {
  margin-top: 20px;
}

.empty-message {
  padding: 40px 0;
  text-align: center;
  color: #909399;
}
</style>