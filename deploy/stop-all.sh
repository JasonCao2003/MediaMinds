#!/usr/bin/env bash
# 停止 MediaMinds 应用服务（默认保留 Docker 基础设施）
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="$ROOT/deploy/pids"

echo "===== 停止应用服务 ====="
for f in "$PID_DIR"/*.pid; do
  [ -e "$f" ] || continue
  name="$(basename "$f" .pid)"
  pid="$(cat "$f")"
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null && echo "  ✔ 已停止 $name (pid $pid)"
  fi
  rm -f "$f"
done

if [ "${1:-}" = "--with-infra" ]; then
  echo "===== 停止 Docker 基础设施 ====="
  docker stop mm-kafka mm-zookeeper mm-minio mm-redis mm-mysql >/dev/null 2>&1
  echo "  ✔ 基础设施已停止"
fi

echo "完成"
