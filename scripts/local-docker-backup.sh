#!/usr/bin/env bash
set -euo pipefail
# 本地备份并上传脚本
# 使用前请修改下方变量或以环境变量传入

SSH_TARGET="root@129.226.152.88"    # 已为你填入提供的目标，可按需修改
REMOTE_DIR="/tmp/docker-sync-uploads"
IMAGES=("your/image:tag")
VOLUMES=("your_volume_name")

TS=$(date +%Y%m%d%H%M%S)
BACKUP_DIR="docker-backup-${TS}"
mkdir -p "${BACKUP_DIR}"

echo "备份 docker-compose.yml 和 .env（如存在）"
[ -f docker-compose.yml ] && cp docker-compose.yml "${BACKUP_DIR}/"
[ -f .env ] && cp .env "${BACKUP_DIR}/"

echo "保存镜像"
for img in "${IMAGES[@]}"; do
  safe_name=$(echo "$img" | tr '/:' '__')
  echo " - saving image $img -> $BACKUP_DIR/${safe_name}.tar"
  docker save -o "$BACKUP_DIR/${safe_name}.tar" "$img"
done

echo "导出卷数据"
for vol in "${VOLUMES[@]}"; do
  echo " - exporting volume $vol"
  docker run --rm -v "$vol":/volume -v "$(pwd)/$BACKUP_DIR":/backup alpine sh -c "cd /volume && tar -czf /backup/${vol}.tar.gz ."
done

echo "打包归档"
tar -czf ${BACKUP_DIR}.tar.gz "$BACKUP_DIR"

echo "上传 ${BACKUP_DIR}.tar.gz 到 ${SSH_TARGET}:${REMOTE_DIR}"
ssh "$SSH_TARGET" "mkdir -p '${REMOTE_DIR}'"
scp "${BACKUP_DIR}.tar.gz" "${SSH_TARGET}:${REMOTE_DIR}/"

echo "上传完成。本地备份：$(pwd)/${BACKUP_DIR}.tar.gz"
echo "提示：在目标主机执行恢复脚本 remote-docker-restore.sh（见 scripts/ 目录）来完成恢复。"

exit 0
