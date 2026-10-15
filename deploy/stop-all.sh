#!/usr/bin/env bash
# 停止 MediaMinds 应用服务（默认保留 Docker 基础设施）
#
# 停止策略（双重保险）：
#   1) 优先按 deploy/pids/*.pid 结束进程及其子孙进程；
#   2) 再按端口兜底——pid 文件缺失/失效，或服务是手动启动的（例如前端），也能停掉。
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="$ROOT/deploy/pids"

# 服务名:端口（与 start-all.sh 保持一致；前端 5173 一并纳入）
SERVICES=(
  "discovery-service:8761"
  "auth-service:9003"
  "music-service:9005"
  "book-service:9006"
  "video-service:9007"
  "agent-service:9011"
  "gateway-service:8080"
  "next:5173"
)

# 找出监听指定端口的进程 PID
port_pids() {
  ss -ltnp 2>/dev/null \
    | awk -v port=":$1" '$4 ~ port "$" { print }' \
    | grep -oP 'pid=\K[0-9]+' \
    | sort -u
}

# 结束进程及其所有子孙进程
# （前端是 npm -> next-server 的多层派生，必须递归收干净）
kill_tree() {
  local pid="$1" child
  for child in $(pgrep -P "$pid" 2>/dev/null); do
    kill_tree "$child"
  done
  kill "$pid" 2>/dev/null
}

# 在同一会话内向上找到最顶层祖先，避免只杀到中间层而留下孤儿进程。
# 以「会话边界」为限，绝不会向上波及用户的 shell 或 systemd。
top_ancestor() {
  local pid="$1" ppid sess
  sess="$(ps -o sess= -p "$pid" 2>/dev/null | tr -d ' ')"
  if [ -z "$sess" ]; then
    echo "$pid"
    return
  fi
  while :; do
    ppid="$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ')"
    [ -z "$ppid" ] && break
    [ "$ppid" = "1" ] && break
    [ "$(ps -o sess= -p "$ppid" 2>/dev/null | tr -d ' ')" = "$sess" ] || break
    pid="$ppid"
  done
  echo "$pid"
}

# 停止单个服务
stop_one() {
  local name="$1" port="$2" pid stopped=0
  local pidfile="$PID_DIR/$name.pid"

  # ① pid 文件
  if [ -f "$pidfile" ]; then
    pid="$(cat "$pidfile" 2>/dev/null)"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill_tree "$pid"
      echo "  ✔ 已停止 $name (pid $pid)"
      stopped=1
    fi
    rm -f "$pidfile"
  fi

  # ② 端口兜底
  for pid in $(port_pids "$port"); do
    kill_tree "$(top_ancestor "$pid")"
    echo "  ✔ 已停止 $name (:${port}, pid $pid)"
    stopped=1
  done

  [ "$stopped" -eq 0 ] && echo "  - $name 未在运行"
}

echo "===== 停止应用服务 ====="
for svc in "${SERVICES[@]}"; do
  stop_one "${svc%%:*}" "${svc##*:}"
done

# 清理可能残留的 pid 文件
rm -f "$PID_DIR"/*.pid 2>/dev/null

# 复核端口是否真的释放
sleep 1
leftover=0
for svc in "${SERVICES[@]}"; do
  port="${svc##*:}"
  if bash -c "echo > /dev/tcp/127.0.0.1/$port" 2>/dev/null; then
    echo "  ! ${svc%%:*} (:${port}) 仍在监听，请手动检查"
    leftover=1
  fi
done
[ "$leftover" -eq 0 ] && echo "  ✔ 全部端口已释放"

if [ "${1:-}" = "--with-infra" ]; then
  echo "===== 停止 Docker 基础设施 ====="
  docker stop mm-minio mm-redis mm-mysql >/dev/null 2>&1
  echo "  ✔ 基础设施已停止"
fi

echo "完成"
