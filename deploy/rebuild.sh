#!/usr/bin/env bash
# ============================================================
# MediaMinds 重新编译脚本
#
# 只做「构建」，不启动 / 重启任何服务。
# 构建完成后如需生效，请自行重启：
#     bash deploy/stop-all.sh && bash deploy/start-all.sh
# ============================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
JAVA_DIR="$ROOT/MediaMinds_java"
NEXT_DIR="$ROOT/MediaMinds_next"

TARGET="all"
CLEAN=0
INCREMENTAL=0
TYPECHECK_ONLY=0

usage() {
  cat <<'EOF'
用法： bash deploy/rebuild.sh [目标] [选项]

目标（默认 all）：
  backend            仅重新编译后端（Maven 多模块）
  frontend           仅重新构建前端（Next.js）
  all                后端 + 前端

选项：
  --incremental      后端跳过 clean（快，但可能产出坏字节码，不推荐）
  --clean            前端构建前删除 .next（后端本来就默认全量编译）
  --typecheck-only   前端只做类型检查（tsc --noEmit），不产出生产构建
  -h, --help         显示本帮助

示例：
  bash deploy/rebuild.sh                     # 全量重新编译（后端默认 clean）
  bash deploy/rebuild.sh backend             # 只重新编译后端
  bash deploy/rebuild.sh frontend --clean    # 只构建前端并清缓存
  bash deploy/rebuild.sh --typecheck-only    # 后端构建 + 前端仅类型检查

说明：
  · 后端**默认执行 `mvn clean install`**。这不是保守，而是必须：
    Maven Compiler Plugin 的增量编译路径与 Lombok 注解处理器冲突，会产出
    Code 属性长度为 0 的坏类（java.lang.ClassFormatError: Invalid method
    Code length 0），表现为「部分」Lombok 类无法加载、服务启动即崩。
    父 pom 已关闭 useIncrementalCompilation，这里再 clean 一次双保险。
  · 后端构建成功后会自动做**类文件完整性自检**（用真实类加载器逐个加载）。
  · 本脚本不会启动或重启任何服务；构建产物就绪后由你自行执行
      bash deploy/stop-all.sh && bash deploy/start-all.sh
EOF
}

# ---------------- 参数解析 ----------------
for arg in "$@"; do
  case "$arg" in
    backend|frontend|all) TARGET="$arg" ;;
    --clean)              CLEAN=1 ;;
    --incremental)        INCREMENTAL=1 ;;
    --typecheck-only)     TYPECHECK_ONLY=1 ;;
    -h|--help)            usage; exit 0 ;;
    *) echo "未知参数：$arg"; echo; usage; exit 2 ;;
  esac
done

# ---------------- 小工具 ----------------
hr()   { printf '%s\n' "------------------------------------------------------------"; }
step() { echo; echo "▶ $*"; hr; }

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "  ✘ 缺少命令：$1"; exit 1; }
}

START_TS=$(date +%s)
FAILED=0

# ============================================================
# 环境检查
# ============================================================
step "环境检查"
need java
need mvn
if [ "$TARGET" != "backend" ]; then
  need node
  need npm
fi

echo "  Java  : $(java -version 2>&1 | head -1)"
echo "  Maven : $(mvn -v 2>/dev/null | head -1)"
if [ "$TARGET" != "backend" ]; then
  echo "  Node  : $(node -v)"
  echo "  npm   : $(npm -v)"
fi
echo "  工程  : $ROOT"

# ============================================================
# 后端：Maven 多模块
# ============================================================
if [ "$TARGET" = "all" ] || [ "$TARGET" = "backend" ]; then
  step "后端构建（Maven）"

  # 默认全量编译：增量编译 + Lombok 会产出坏字节码（见 usage 说明）
  GOALS="clean install"
  if [ "$INCREMENTAL" -eq 1 ]; then
    GOALS="install"
    echo "  ⚠ --incremental：跳过 clean。若下方自检报错，请改用默认全量模式。"
    echo
  fi

  echo "  执行：cd MediaMinds_java && mvn -DskipTests $GOALS"
  echo

  if ( cd "$JAVA_DIR" && mvn -DskipTests $GOALS ); then
    echo
    echo "  ✔ 后端构建成功"
    echo "  产物（可执行 jar）："
    find "$JAVA_DIR" -maxdepth 3 -name "*.jar" -path "*/target/*" 2>/dev/null \
      | grep -v original \
      | sed "s|$JAVA_DIR/||" \
      | sed 's/^/    /' \
      | sort

    # ---------------- 类文件完整性自检 ----------------
    # 比对 md5 / jar 与 target/classes 是否一致都没有意义（只能证明「一致地坏」），
    # 必须用真实类加载器逐个加载才能发现 Code 属性长度为 0 的坏类。
    echo
    step "类文件完整性自检"
    CLASS_DIRS=$(find "$JAVA_DIR" -maxdepth 3 -type d -path "*/target/classes" 2>/dev/null | sort)
    if [ -z "$CLASS_DIRS" ]; then
      echo "  未找到 target/classes，跳过"
    elif java "$ROOT/deploy/tools/CheckClassFiles.java" $CLASS_DIRS; then
      :
    else
      echo
      echo "  ✘ 检测到字节码损坏的类，这批 jar 不可用（启动会抛 ClassFormatError）"
      echo "    请改用默认全量模式重试："
      echo "      bash deploy/rebuild.sh backend"
      FAILED=1
    fi
  else
    echo
    echo "  ✘ 后端构建失败"
    FAILED=1
  fi
fi

# ============================================================
# 前端：Next.js
# ============================================================
if [ "$TARGET" = "all" ] || [ "$TARGET" = "frontend" ]; then
  step "前端构建（Next.js）"

  if [ ! -d "$NEXT_DIR/node_modules" ]; then
    echo "  未检测到 node_modules，先执行 npm install ..."
    if ( cd "$NEXT_DIR" && npm install ); then
      echo "  ✔ 依赖安装完成"
    else
      echo "  ✘ npm install 失败"
      FAILED=1
    fi
    echo
  fi

  if [ "$FAILED" -eq 0 ]; then
    if [ "$CLEAN" -eq 1 ]; then
      echo "  清理构建缓存：rm -rf MediaMinds_next/.next"
      rm -rf "$NEXT_DIR/.next"
      echo
    fi

    echo "  类型检查：npx tsc --noEmit"
    if ( cd "$NEXT_DIR" && npx tsc --noEmit ); then
      echo "  ✔ 类型检查通过"
    else
      echo "  ✘ 类型检查失败"
      FAILED=1
    fi
    echo

    if [ "$FAILED" -eq 0 ] && [ "$TYPECHECK_ONLY" -eq 0 ]; then
      echo "  生产构建：npm run build"
      echo
      if ( cd "$NEXT_DIR" && npm run build ); then
        echo
        echo "  ✔ 前端构建成功（产物：MediaMinds_next/.next）"
      else
        echo
        echo "  ✘ 前端构建失败"
        FAILED=1
      fi
    elif [ "$TYPECHECK_ONLY" -eq 1 ]; then
      echo "  （--typecheck-only：已跳过 npm run build）"
    fi
  fi
fi

# ============================================================
# 汇总
# ============================================================
END_TS=$(date +%s)
ELAPSED=$((END_TS - START_TS))

step "构建结果"
if [ "$FAILED" -eq 0 ]; then
  echo "  ✔ 全部成功，耗时 ${ELAPSED}s"
  echo
  echo "  下一步（由你手动执行）："
  echo "    bash deploy/stop-all.sh && bash deploy/start-all.sh"
else
  echo "  ✘ 出现错误，耗时 ${ELAPSED}s"
  echo "    请根据上方输出定位问题后重试。"
fi
echo

exit "$FAILED"
