'use client';

import SockJS from 'sockjs-client';
import { Client, IMessage } from '@stomp/stompjs';
import { getToken, useAuthStore } from '@/stores/authStore';
import { pushMessage, type AppMessage } from '@/stores/messageStore';
import { notifyBus } from './notify';

/**
 * STOMP over SockJS 通知服务（对应原 Vue 版 websocketService）。
 * 负责：连接 / 自动重连 / 订阅系统与个人频道 / 消息规范化 / 通知推送。
 */
class WebSocketService {
  private client: Client | null = null;
  connected = false;
  private connecting = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly reconnectDelay = 3000;
  private messageCallbacks: Array<(msg: AppMessage, frame?: IMessage) => void> = [];

  private resolveUrl(): string {
    // 浏览器端统一通过 Next rewrites 的 /ws 走代理；SSR 阶段不使用。
    return '/ws';
  }

  connect() {
    if (this.connected || this.connecting || typeof window === 'undefined') return;
    this.connecting = true;

    const token = getToken();

    this.client = new Client({
      webSocketFactory: () => new SockJS(this.resolveUrl()) as unknown as WebSocket,
      connectHeaders: token ? { Authorization: token } : {},
      reconnectDelay: this.reconnectDelay,
      heartbeatIncoming: 25000,
      heartbeatOutgoing: 25000,
      debug: () => {},
      onConnect: () => this.onConnected(),
      onStompError: () => this.onError(),
      onWebSocketError: () => this.onError(),
      onWebSocketClose: () => {
        this.connected = false;
        this.connecting = false;
      },
    });

    try {
      this.client.activate();
    } catch {
      this.connecting = false;
      this.handleReconnect();
    }
  }

  private onConnected() {
    this.connected = true;
    this.connecting = false;
    this.reconnectAttempts = 0;

    this.client?.subscribe('/topic/notifications', (f) => this.handleMessage(f));
    this.client?.subscribe('/topic/messages', (f) => this.handleMessage(f));

    const userId = useAuthStore.getState().info?.userId;
    if (userId) {
      this.client?.subscribe(`/user/${userId}/queue/messages`, (f) => this.handleMessage(f));
    }
  }

  private onError() {
    this.connected = false;
    this.connecting = false;
    this.handleReconnect();
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      setTimeout(() => (this.reconnectAttempts = 0), 60000);
      return;
    }
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    setTimeout(() => {
      if (!this.connected && !this.connecting) this.connect();
    }, delay);
  }

  subscribe(channel: string, callback: (msg: AppMessage) => void) {
    if (!this.connected) {
      this.connect();
      return;
    }
    this.client?.subscribe(channel, (f) => {
      try {
        callback(JSON.parse(f.body) as AppMessage);
      } catch {
        /* ignore malformed */
      }
    });
  }

  sendMessage(destination: string, body: unknown) {
    if (!this.connected) {
      this.connect();
      setTimeout(() => this.sendMessage(destination, body), 1000);
      return;
    }
    this.client?.publish({ destination, body: JSON.stringify(body) });
  }

  onMessage(cb: (msg: AppMessage, frame?: IMessage) => void) {
    if (!this.messageCallbacks.includes(cb)) this.messageCallbacks.push(cb);
  }

  offMessage(cb: (msg: AppMessage, frame?: IMessage) => void) {
    this.messageCallbacks = this.messageCallbacks.filter((c) => c !== cb);
  }

  private handleMessage(frame: IMessage) {
    let message: AppMessage;
    try {
      message = JSON.parse(frame.body) as AppMessage;
    } catch {
      message = { id: crypto.randomUUID(), title: '消息解析失败', content: String(frame.body) };
    }

    message.id = message.id || crypto.randomUUID();
    message.timestamp = message.timestamp || Date.now();
    message.time = message.time || message.timestamp;

    // 过滤心跳 / 自动测试消息
    const text = (message.content || message.title || '').toLowerCase();
    if (text.includes('自动测试') || text.includes('auto test') || text.includes('heartbeat')) return;

    // 规范化字段，映射到消息中心
    if (!message.title) message.title = message.type === 'system' ? '系统通知' : '信息通知';
    if (!message.content && message.title) message.content = message.title;
    if (text.includes('系统公告') || text.includes('广播')) {
      message.isSystem = true;
      message.isBroadcast = true;
    }

    message.read = false;
    pushMessage(message);
    notifyBus.emit({
      title: message.title,
      message: message.content,
      severity: message.isSystem ? 'info' : 'success',
    });

    this.messageCallbacks.forEach((cb) => {
      try {
        cb(message, frame);
      } catch {
        /* noop */
      }
    });
  }

  disconnect() {
    if (this.client) {
      try {
        this.client.deactivate();
      } catch {
        /* noop */
      }
      this.client = null;
    }
    this.connected = false;
    this.connecting = false;
  }
}

const websocketService = new WebSocketService();
export default websocketService;
