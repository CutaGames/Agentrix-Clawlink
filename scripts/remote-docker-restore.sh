#!/usr/bin/env bash
set -euo pipefail
# 云端恢复脚本：在云端服务器上运行（从上传目录恢复）

ARCHIVE_DIR="/tmp/docker-sync-uploads"
WORKDIR="/tmp/docker-restore-$(date +%s)"
mkdir -p "$WORKDIR"

echo "查找最新归档"
ARCHIVE=$(ls -t ${ARCHIVE_DIR}/*.tar.gz 2>/dev/null | head -n1 || true)
if [ -z "$ARCHIVE" ]; then
  echo "未找到归档文件于 ${ARCHIVE_DIR}"
  exit 1
fi

echo "使用归档： $ARCHIVE"
tar -xzf "$ARCHIVE" -C "$WORKDIR"

echo "（可选）停止当前 docker-compose 服务并备份旧数据，按需解注释下列命令"
# if [ -f "$WORKDIR/docker-compose.yml" ]; then
#   docker-compose -f "$WORKDIR/docker-compose.yml" down || true
# fi

echo "导入镜像"
shopt -s nullglob
for f in "$WORKDIR"/*.tar; do
  echo " - loading $f"
  docker load -i "$f"
done

echo "恢复卷数据（假设归档内 tar.gz 名称与卷名相同）"
for gz in "$WORKDIR"/*.tar.gz; do
  [ -f "$gz" ] || continue
  name=$(basename "$gz" .tar.gz)
  vol_name="$name"
  echo " - restoring volume $vol_name from $gz"
  docker volume create "$vol_name" || true
  docker run --rm -v "$vol_name":/volume -v "$WORKDIR":/backup alpine sh -c "cd /volume && tar -xzf /backup/$(basename "$gz")"
done

echo "如存在 docker-compose.yml，将尝试启动服务"
if [ -f "$WORKDIR/docker-compose.yml" ]; then
  docker-compose -f "$WORKDIR/docker-compose.yml" up -d
else
  echo "未找到 docker-compose.yml，请手动启动服务或检查 $WORKDIR"
fi

echo "恢复完成，列出正在运行的容器："
docker ps

exit 0
