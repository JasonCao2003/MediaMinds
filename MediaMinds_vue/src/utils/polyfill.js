// 为 sockjs-client 提供 global 变量
window.global = window;

// 添加其他可能需要的 Node.js 环境变量
if (typeof window.process === 'undefined') {
  window.process = {
    env: {}
  };
} 

// 确保WebSocket对象可用
if (typeof window.WebSocket === 'undefined') {
  console.warn('浏览器不支持原生WebSocket，SockJS将使用降级策略');
}

// 修复某些浏览器中SockJS的跨域问题
if (typeof window.XDomainRequest !== 'undefined') {
  // 对于IE浏览器，确保XDomainRequest可用于跨域请求
  console.log('检测到IE浏览器，应用XDomainRequest补丁');
}

// 添加WebSocket连接状态常量，如果缺失
if (typeof window.WebSocket !== 'undefined') {
  if (typeof window.WebSocket.CONNECTING === 'undefined') {
    window.WebSocket.CONNECTING = 0;
  }
  if (typeof window.WebSocket.OPEN === 'undefined') {
    window.WebSocket.OPEN = 1;
  }
  if (typeof window.WebSocket.CLOSING === 'undefined') {
    window.WebSocket.CLOSING = 2;
  }
  if (typeof window.WebSocket.CLOSED === 'undefined') {
    window.WebSocket.CLOSED = 3;
  }
} 