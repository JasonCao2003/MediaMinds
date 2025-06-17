import SockJS from 'sockjs-client';
import * as StompJS from '@stomp/stompjs';
import { ElNotification } from 'element-plus';
import { useTokenStore } from '@/stores/token';
import useUserInfoStore from '@/stores/userInfo';

// 初始化store变量
let tokenStore = null;
let userInfoStore = null;

// 延迟初始化store，解决组合式API在模块顶层调用的问题
function initStores() {
  if (!tokenStore) {
    try {
      tokenStore = useTokenStore();
    } catch (e) {
      console.warn('无法初始化token store:', e);
    }
  }
  
  if (!userInfoStore) {
    try {
      userInfoStore = useUserInfoStore();
    } catch (e) {
      console.warn('无法初始化user info store:', e);
    }
  }
  
  return { tokenStore, userInfoStore };
}

class WebSocketService {
  constructor() {
    this.stompClient = null;
    this.connected = false;
    this.connecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 3000;
    this.messageCallbacks = [];
    this.subscriptions = {};
    this.directWsUrl = 'http://localhost:9001/ws';
    this.proxyWsUrl = '/ws';
    this.serverUrl = this.directWsUrl;
    this.debug = false; // 禁用调试模式
    
    // 用于消息记录
    this.messageHistory = [];
    this.maxHistoryLength = 20;
    
    this.store = null;
  }

  connect() {
    if (this.connected || this.connecting) return;
    
    this.connecting = true;
    
    // 确保store已初始化
    const { tokenStore: currentTokenStore } = initStores();
    
    // 创建WebSocket连接工厂函数
    const socketFactory = () => {
      // 获取当前要使用的URL
      let url = this.serverUrl;
      
      // 如果URL包含192.168.1.108，替换为localhost
      if (url.includes('192.168.1.108')) {
        url = url.replace('192.168.1.108', 'localhost');
      }
      
      // 如果URL是相对路径(/ws)，则使用本地代理
      if (url === '/ws' && process.env.NODE_ENV === 'development') {
        url = 'http://localhost:9001/ws';
      }
      
      // 阻止连接到已知有问题的IP地址
      if (this.isProblematicUrl(url)) {
        throw new Error('连接被阻止');
      }
      
      try {
        // 使用更多WebSocket选项
        return new SockJS(url, null, {
          timeout: 30000,
          heartbeat: 20000,
          disableAutoReconnect: true,
          headers: {
            'Origin': window.location.origin,
            'Cache-Control': 'no-cache'
          }
        });
      } catch (error) {
        throw error;
      }
    };
    
    // 使用工厂函数创建Stomp客户端
    try {
      this.stompClient = StompJS.Stomp.over(socketFactory);
      
      // 配置Stomp客户端
      this.stompClient.reconnect_delay = this.reconnectDelay;
      this.stompClient.heartbeat.outgoing = 25000;
      this.stompClient.heartbeat.incoming = 25000;
      
      // 禁用自动重连
      this.stompClient.reconnectDelay = this.reconnectDelay;
      this.stompClient.maxReconnectDelay = 10000;
      this.stompClient.maxReconnectAttempts = 2;
      
      // 静默STOMP调试信息
      this.stompClient.debug = () => {};
      
      // 准备连接头信息
      const headers = {};
      
      // 如果有token，添加到头信息中
      if (currentTokenStore && currentTokenStore.getToken) {
        const token = currentTokenStore.getToken();
        if (token) {
          headers['Authorization'] = token;
        }
      }

      // 设置连接回调
      try {
        this.stompClient.connect(
          headers,
          this.onConnected.bind(this),
          this.onStompError.bind(this)
        );
      } catch (error) {
        this.connecting = false;
        this.handleReconnect();
      }
    } catch (error) {
      this.connecting = false;
      this.handleReconnect();
    }
  }

  disconnect() {
    if (this.stompClient && this.connected) {
      this.stompClient.disconnect();
      this.connected = false;
    }
  }

  onConnected() {
    this.connected = true;
    this.connecting = false;
    this.reconnectAttempts = 0;
    
    // 订阅默认频道
    this.subscribeToNotifications();
    
    // 重新订阅之前的频道
    Object.keys(this.subscriptions).forEach(channel => {
      this.subscribe(channel, this.subscriptions[channel]);
    });
  }

  onStompError(error) {
    this.connecting = false;
    this.connected = false;
    
    // 如果使用直连失败，尝试通过代理连接
    if (this.serverUrl === this.directWsUrl) {
      console.log('直连9001端口失败，尝试通过代理连接');
      this.serverUrl = this.proxyWsUrl;
      this.connect();
      return;
    }
    
    // 如果通过代理连接失败，尝试使用兼容性更好的完整URL
    if (this.serverUrl === this.proxyWsUrl && this.reconnectAttempts === 0) {
      console.log('代理连接失败，尝试使用完整URL（带协议和域名）');
      this.serverUrl = window.location.protocol + '//' + window.location.host + this.proxyWsUrl;
      this.connect();
      return;
    }
    
    this.handleReconnect();
  }

  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts = 0;
      }, 60000); // 1分钟后重置
      return;
    }

    this.reconnectAttempts++;
    
    // 指数退避重连
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    
    // 清理旧连接
    if (this.stompClient) {
      try {
        if (this.stompClient.connected) {
          this.stompClient.disconnect();
        }
        this.stompClient = null;
      } catch (e) {
        console.error('断开旧连接失败:', e);
      }
    }
    
    // 安排新的连接
    setTimeout(() => {
      if (!this.connected && !this.connecting) {
        this.connect();
      }
    }, delay);
  }

  subscribeToNotifications() {
    if (!this.connected) return;
    
    // 订阅服务器广播主题
    this.stompClient.subscribe('/topic/notifications', this.handleMessage.bind(this));
    
    // 订阅消息主题
    this.stompClient.subscribe('/topic/messages', this.handleMessage.bind(this));
    
    // 如果用户已登录，订阅用户特定的消息
    this.subscribeToUserMessages();
  }

  // 订阅当前登录用户的消息
  subscribeToUserMessages() {
    // 确保store已初始化
    const { userInfoStore: currentUserStore } = initStores();
    
    // 检查是否能获取用户信息
    if (!currentUserStore || !currentUserStore.isLoggedIn || !currentUserStore.isLoggedIn()) {
      return;
    }
    
    try {
      const userId = currentUserStore.info.userId;
      if (userId) {
        // 订阅用户特定的队列
        this.stompClient.subscribe(`/user/${userId}/queue/messages`, this.handleMessage.bind(this));
      }
    } catch (error) {
      console.error('订阅用户消息失败:', error);
    }
  }

  subscribe(channel, callback) {
    if (!this.connected) {
      this.connect();
      this.subscriptions[channel] = callback;
      return;
    }

    return this.stompClient.subscribe(channel, frame => {
      try {
        const message = JSON.parse(frame.body);
        callback(message);
      } catch (error) {
        console.error('解析订阅消息失败', error);
      }
    });
  }

  unsubscribe(channel) {
    if (this.subscriptions[channel]) {
      delete this.subscriptions[channel];
    }
  }

  sendMessage(destination, message) {
    if (!this.connected) {
      this.connect();
      setTimeout(() => this.sendMessage(destination, message), 1000);
      return;
    }

    this.stompClient.send(
      destination,
      {},
      JSON.stringify(message)
    );
  }

  handleMessage(frame) {
    try {
      let message;
      
      // 尝试解析WebSocket消息
      try {
        message = typeof frame.body === 'string' ? JSON.parse(frame.body) : frame.body;
      } catch (parseError) {
        message = { error: '消息解析失败', originalMessage: frame.body };
      }
      
      // 添加时间戳
      if (!message.timestamp) {
        message.timestamp = new Date().getTime();
      }
      
      // 记录消息历史
      this.recordMessageHistory(message, 'received');
      
      // 处理Kafka消息
      if (frame.headers && frame.headers.destination && frame.headers.destination.includes('kafka')) {
        this.processKafkaMessage(message);
      }
      
      // 准备消息对象
      this.prepareMessageObject(message);
      
      // 如果消息内容是自动测试的，则不处理
      if (message.content && 
         (message.content.includes('自动测试') || 
          message.content.includes('auto test') || 
          message.content.toLowerCase().includes('heartbeat'))) {
        return;
      }
      
      // 检查消息类型并处理
      if (message.type) {
        switch (message.type) {
          case 'NEW_CONTENT':
          case 'NEW_CONTENT_NOTIFICATION':
            message.isSystem = false;
            message.isPersonal = true;
            message.isBroadcast = false;
            message.addToMessageCenter = true;
            break;
            
          case 'COMMENT_REPLY':
          case 'COMMENT_NOTIFICATION':
            message.isSystem = false;
            message.isPersonal = true;
            message.isBroadcast = false;
            message.addToMessageCenter = true;
            break;
            
          case 'SYSTEM_NOTIFICATION':
          case 'BROADCAST':
            message.isSystem = true;
            message.isPersonal = false;
            message.isBroadcast = true;
            message.addToMessageCenter = true;
            break;
            
          case 'PRIVATE_MESSAGE':
            message.isSystem = false;
            message.isPersonal = true;
            message.isBroadcast = false;
            message.addToMessageCenter = true;
            break;
            
          default:
            // 默认不添加到消息中心
            message.addToMessageCenter = false;
        }
      }
      
      // 如果消息没有内容但有title，将title作为内容
      if (!message.content && message.title) {
        message.content = message.title;
      }
      
      // 为特定类型消息提供默认内容
      if (!message.content) {
        if (message.type === 'NEW_CONTENT_NOTIFICATION') {
          message.content = '有人发布了新内容';
        } else if (message.type === 'COMMENT_NOTIFICATION') {
          message.content = '有人评论了你的内容';
        } else if (message.type === 'SYSTEM_NOTIFICATION') {
          message.content = '系统通知';
        }
      }
      
      // 检查消息内容是否包含"系统公告"或"广播"关键词
      const messageText = (message.message || message.content || '').toLowerCase();
      if (messageText.includes('系统公告') || 
          messageText.includes('公告:') || 
          messageText.includes('公告：') || 
          messageText.includes('广播:') || 
          messageText.includes('广播：')) {
        message.isSystem = true;
        message.isBroadcast = true;
        message.addToMessageCenter = true;
      }
      
      // 如果标记为添加到消息中心，并且尚未格式化
      if (message.addToMessageCenter && !message.isFormatted) {
        // 格式化消息为消息中心格式
        this.formatMessageForCenter(message);
        
        // 添加到消息中心
        if (this.store) {
          this.store.dispatch('addMessage', message);
        }
      }
      
      // 如果标记为系统通知，显示通知
      if (message.showNotification !== false) {
        this.showNotification(message);
      }
      
      // 调用所有注册的消息回调
      for (const callback of this.messageCallbacks) {
        try {
          callback(message, frame);
        } catch (callbackError) {
          console.error('消息回调处理错误:', callbackError);
        }
      }
    } catch (error) {
      console.error('处理WebSocket消息时出错:', error, frame);
    }
  }
  
  // 记录消息历史
  recordMessageHistory(message, stage) {
    try {
      // 创建历史记录条目
      const historyEntry = {
        message: JSON.parse(JSON.stringify(message)), // 深拷贝消息对象
        stage, // 阶段：received, filtered, processed, etc.
        timestamp: new Date().toISOString()
      };
      
      // 添加到历史记录
      this.messageHistory.unshift(historyEntry);
      
      // 限制历史记录长度
      if (this.messageHistory.length > this.maxHistoryLength) {
        this.messageHistory.pop();
      }
    } catch (error) {
      console.error('记录消息历史失败:', error);
    }
  }
  
  // 处理Kafka特定类型的消息
  processKafkaMessage(message) {
    // 处理Kafka消息类型，将其转换为系统适用的类型
    if (message.type) {
      switch(message.type) {
        case 'NEW_CONTENT':
          // 新内容通知
          message.title = '新内容通知';
          message.type = 'info';
          message.addToMessageCenter = true; // 确保添加到消息中心
          message.isSystem = true;
          message.isBroadcast = true; // 新内容是广播消息
          
          // 强制设置消息内容
          if (!message.content && !message.message) {
            message.content = '系统有新内容更新，快去查看吧';
            message.message = message.content;
          }
          break;
          
        case 'COMMENT_REPLY':
          // 评论回复通知
          message.title = '评论回复通知';
          message.type = 'info';
          message.addToMessageCenter = true;
          message.isPersonal = true;
          message.isBroadcast = false; // 评论回复是私人消息
          
          // 强制设置消息内容
          if (!message.content && !message.message) {
            message.content = '有人回复了您的评论';
            message.message = message.content;
          }
          break;
          
        case 'COLLECT_SUCCESS':
          // 收藏成功通知
          message.title = '收藏成功';
          message.type = 'success';
          message.addToMessageCenter = true;
          message.isPersonal = true;
          message.isBroadcast = false; // 收藏成功是私人消息
          
          // 强制设置消息内容
          if (!message.content && !message.message) {
            message.content = '内容已成功添加到您的收藏';
            message.message = message.content;
          }
          break;
          
        case 'RECOMMENDATION':
          // 推荐内容通知
          message.title = '为您推荐';
          message.type = 'info';
          message.addToMessageCenter = true;
          message.isPersonal = true; // 推荐是针对特定用户的
          message.isBroadcast = false;
          
          // 强制设置消息内容
          if (!message.content && !message.message) {
            message.content = '系统为您推荐了新内容';
            message.message = message.content;
          }
          break;
          
        case 'SYSTEM_NOTICE':
          // 系统通知
          message.title = '系统公告';
          message.type = 'system';
          message.addToMessageCenter = true;
          message.isSystem = true;
          message.isBroadcast = true; // 系统公告是广播消息
          
          // 强制设置消息内容
          if (!message.content && !message.message) {
            message.content = '您有一条系统通知';
            message.message = message.content;
          }
          break;
      }
    }
  }

  // 准备消息对象，确保所有必要字段存在
  prepareMessageObject(message) {
    // 确保title存在
    if (!message.title) {
      const titleMap = {
        'info': '信息通知',
        'success': '成功通知',
        'warning': '警告通知',
        'error': '错误通知',
        'system': '系统通知'
      };
      message.title = titleMap[message.type] || '系统通知';
    }

    // 确保content字段存在（消息中心使用content字段）
    if (!message.content && message.message) {
      message.content = message.message;
    } else if (!message.content) {
      message.content = '收到新消息';
    }

    // 确保message字段存在（通知组件使用message字段）
    if (!message.message && message.content) {
      message.message = message.content;
    }

    // 自动设置消息的类型标记
    if (message.type === 'system' || message.type === 'info' && !message.isPersonal) {
      message.isSystem = true;
    }

    // 检查消息内容是否包含"系统公告"或"广播"关键词
    const messageText = (message.message || message.content || '').toLowerCase();
    if (messageText.includes('系统公告') || 
        messageText.includes('公告:') || 
        messageText.includes('公告：') || 
        messageText.includes('广播:') || 
        messageText.includes('广播：')) {
      message.isSystem = true;
      message.isBroadcast = true;
      message.addToMessageCenter = true;
    }
  }

  // 格式化消息对象为消息中心格式
  formatMessageForCenter(message) {
    // 添加时间戳
    if (!message.time) {
      message.time = new Date().getTime();
    }
    
    // 标记为未读
    message.read = false;
    
    // 标记为已格式化
    message.isFormatted = true;
  }

  showNotification(message) {
    // 如果消息对象为空，则使用默认值
    if (!message) {
      message = { type: 'info', message: '收到新消息' };
    }
    
    // 如果message是字符串，将其包装为对象
    if (typeof message === 'string') {
      message = { message: message, type: 'info' };
    }
    
    // 确保message.message存在
    if (!message.message && message.content) {
      message.message = message.content;
    }
    
    // 根据消息类型显示不同样式的通知
    ElNotification({
      title: message.title || '系统通知',
      message: message.message || '',
      type: message.type || 'info',
      duration: message.duration || 5000,
      position: message.position || 'top-right',
      showClose: true, // 确保显示关闭按钮
      dangerouslyUseHTMLString: false // 出于安全考虑，不使用HTML
    });
    
    // 播放提示音（如果消息指定了提示音或默认启用）
    if (message.playSound !== false) {
      this.playNotificationSound(message.type);
    }
  }
  
  // 播放通知提示音
  playNotificationSound(type = 'info') {
    try {
      let soundFile;
      
      // 根据消息类型选择不同的提示音
      switch (type) {
        case 'success':
          soundFile = '/sounds/success.mp3';
          break;
        case 'warning':
          soundFile = '/sounds/warning.mp3';
          break;
        case 'error':
          soundFile = '/sounds/error.mp3';
          break;
        default:
          soundFile = '/sounds/notification.mp3';
      }
      
      // 创建音频对象并播放
      const audio = new Audio(soundFile);
      audio.volume = 0.5;
      audio.play().catch(err => {
        console.warn('无法播放通知提示音:', err);
      });
    } catch (error) {
      console.warn('播放提示音失败:', error);
    }
  }

  onMessage(callback) {
    if (typeof callback === 'function' && !this.messageCallbacks.includes(callback)) {
      this.messageCallbacks.push(callback);
    }
  }

  offMessage(callback) {
    const index = this.messageCallbacks.indexOf(callback);
    if (index !== -1) {
      this.messageCallbacks.splice(index, 1);
    }
  }

  // 设置store的方法，允许外部组件传入store
  setStore(store) {
    this.store = store;
  }

  // 断开所有WebSocket连接（简化版）
  forceDisconnectAll() {
    // 断开主连接
    this.disconnect();
    
    // 重置状态
    this.connected = false;
    this.connecting = false;
    this.reconnectAttempts = 0;
    
    // 清空客户端引用
    this.stompClient = null;
    
    return true;
  }
  
  // 检查是否有问题地址
  isProblematicUrl(url) {
    if (!url) return false;
    
    const problematicHosts = [
      '192.168.1.108:5173',
      '192.168.1.108/ws'
    ];
    
    return problematicHosts.some(host => url.includes(host));
  }
}

// 创建单例实例
const websocketService = new WebSocketService();
export default websocketService; 