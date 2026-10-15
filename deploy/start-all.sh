#!/usr/bin/env bash
# MediaMinds 一键启动脚本
# 启动顺序：基础设施(Docker) -> Eureka -> 业务微服务 -> 网关 -> 前端
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
JAVA_DIR="$ROOT/MediaMinds_java"
LOG_DIR="$ROOT/deploy/logs"
PID_DIR="$ROOT/deploy/pids"
mkdir -p "$LOG_DIR" "$PID_DIR"

# 载入本地环境变量（如 TMDB_ACCESS_TOKEN / KUGOU_TOKEN），文件不入库
if [ -f "$ROOT/deploy/.env.local" ]; then
  # shellcheck disable=SC1091
  source "$ROOT/deploy/.env.local"
  echo "  ✔ 已载入 deploy/.env.local"
fi

# 服务名 : 端口 : 模块目录
SERVICES=(
  "discovery-service:8761:discovery-service"
  "config-service:8888:config-service"
  "auth-service:9003:auth-service"
  "music-service:9005:music-service"
  "book-service:9006:book-service"
  "video-service:9007:video-service"
  "agent-service:9011:agent-service"
  "document-service:9009:document-service"
  "flask-service:9010:flask-service"
  "notification-service:9001:notification-service"
  "gateway-service:8080:gateway-service"
)

wait_port() {
  local port="$1" name="$2" tries="${3:-60}"
  for ((i=0; i<tries; i++)); do
    if bash -c "echo > /dev/tcp/127.0.0.1/$port" 2>/dev/null; then
      echo "  ✔ $name (:${port}) 已就绪"
      return 0
    fi
    sleep 2
  done
  echo "  ! $name (:${port}) 等待超时"
  return 1
}

start_service() {
  local name="$1" port="$2" module="$3"
  if [ -f "$PID_DIR/$name.pid" ] && kill -0 "$(cat "$PID_DIR/$name.pid")" 2>/dev/null; then
    echo "  - $name 已在运行，跳过"
    return 0
  fi
  local jar
  jar="$(ls "$JAVA_DIR/$module/target/"*.jar 2>/dev/null | grep -v 'original' | head -1)"
  if [ -z "$jar" ]; then
    echo "  ✘ 未找到 $module 的可执行 jar，请先执行 mvn -DskipTests install"
    return 1
  fi
  echo "  启动 $name (:${port}) ..."
  setsid nohup java -Dnetworkaddress.cache.ttl=30 -Dnetworkaddress.cache.negative.ttl=5 -jar "$jar" > "$LOG_DIR/$name.log" 2>&1 < /dev/null &
  echo $! > "$PID_DIR/$name.pid"
}

echo "===== 1. 启动基础设施（Docker） ====="
for c in mm-mysql mm-redis mm-minio mm-zookeeper mm-kafka; do
  if docker ps --format '{{.Names}}' | grep -q "^$c$"; then
    echo "  - $c 已在运行"
  else
    docker start "$c" >/dev/null 2>&1 && echo "  ✔ $c 已启动" || echo "  ✘ $c 启动失败（不存在？）"
  fi
done
wait_port 3306 "MySQL"
wait_port 6379 "Redis"
wait_port 9000 "MinIO"
wait_port 9092 "Kafka"
wait_port 2181 "Zookeeper" || true

echo "===== 2. 启动 Eureka 注册中心 ====="
start_service discovery-service 8761 discovery-service
wait_port 8761 "discovery-service" 60

echo "  启动 config-service (配置中心 :8888) ..."
start_service config-service 8888 config-service

echo "===== 3. 启动业务微服务 ====="
for svc in auth-service:9003:auth-service music-service:9005:music-service book-service:9006:book-service video-service:9007:video-service agent-service:9011:agent-service document-service:9009:document-service flask-service:9010:flask-service notification-service:9001:notification-service; do
  IFS=':' read -r name port module <<< "$svc"
  start_service "$name" "$port" "$module"
done

echo "  等待业务服务完成注册与初始化 ..."
for svc in auth-service:9003 music-service:9005 book-service:9006 video-service:9007 agent-service:9011 document-service:9009 flask-service:9010 notification-service:9001; do
  IFS=':' read -r name port <<< "$svc"
  wait_port "$port" "$name" 90 || true
done

echo "===== 4. 启动网关 ====="
start_service gateway-service 8080 gateway-service
wait_port 8080 "gateway-service" 60

echo "===== 5. 启动前端 ====="
if bash -c "echo > /dev/tcp/127.0.0.1/5173" 2>/dev/null; then
  echo "  - 5173 已被占用，跳过 Next.js 前端"
else
  echo "  启动 Next.js 前端 (:5173) ..."
  (cd "$ROOT/MediaMinds_next" && setsid nohup npm run dev -- -p 5173 > "$LOG_DIR/next.log" 2>&1 < /dev/null & echo $! > "$PID_DIR/next.pid")
fi

echo
echo "===== 启动完成 ====="
echo "  网关:        http://localhost:8080"
echo "  Eureka:      http://localhost:8761"
echo "  Next 前端:   http://localhost:5173"
echo "  MinIO 控制台: http://localhost:9101  (minioadmin/minioadmin)"
echo "  日志目录:    $LOG_DIR"
echo "  停止服务:    bash deploy/stop-all.sh"
