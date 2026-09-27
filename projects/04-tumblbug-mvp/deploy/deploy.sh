#!/usr/bin/env bash
# EC2 서버에서 새 이미지로 바꿔 끼우고, 실패하면 이전 이미지로 되돌리는 스크립트 (16주차)
#   사용: bash ~/moa/deploy.sh ghcr.io/계정/moa-app:커밋SHA
# 배포 워크플로(.github/workflows/ec2.yml)가 SSH 로 이 스크립트를 부른다. 직접 불러도 된다 (롤백 연습)
set -euo pipefail
cd ~/moa

NEW_IMAGE="$1"
PREV_IMAGE="$(cat current-image 2>/dev/null || true)" # 지금 잘 돌고 있는 이미지 (첫 배포면 없음)

# 이미지 태그 = 커밋 SHA → /api/health 의 commit 으로 보이게 APP_VERSION 에도 넣는다
up() {
  APP_IMAGE="$1" APP_VERSION="${1##*:}" docker compose -f compose.prod.yaml up -d --wait --wait-timeout 120
}
# --wait: 컨테이너가 healthy 가 될 때까지 기다린다 (Dockerfile 의 HEALTHCHECK = /api/health 가 200)
#         120초 안에 healthy 가 안 되면 실패로 끝난다 → 아래에서 되돌린다

echo "▶ 새 이미지 준비: $NEW_IMAGE"
# 태그가 커밋 SHA 라서 같은 이름이면 내용도 같다 → 서버에 이미 있으면 다시 받지 않는다 (롤백이 빨라진다)
docker image inspect "$NEW_IMAGE" >/dev/null 2>&1 || docker pull "$NEW_IMAGE"

echo "▶ 바꿔 끼우기 (이전: ${PREV_IMAGE:-없음})"
if up "$NEW_IMAGE"; then
  echo "$NEW_IMAGE" > current-image
  echo "✅ 배포 성공 — healthy"
  # 디스크 정리: 지금 쓰는 것 말고, 만든 지 3일 넘은 안 쓰는 이미지를 지운다 (방금 전 이미지는 롤백용으로 남는다)
  docker image prune -af --filter "until=72h" >/dev/null || true
  exit 0
fi

echo "❌ 새 이미지가 healthy 가 되지 못했다 — 최근 로그:"
APP_IMAGE="$NEW_IMAGE" docker compose -f compose.prod.yaml logs app --tail 30 || true

if [ -n "$PREV_IMAGE" ]; then
  echo "↩ 이전 이미지로 되돌리기: $PREV_IMAGE"
  up "$PREV_IMAGE"
  echo "↩ 되돌리기 완료 — 사이트는 이전 버전으로 계속 동작한다"
fi
exit 1 # 배포 자체는 실패 → 워크플로가 빨간불 + 실패 메일
