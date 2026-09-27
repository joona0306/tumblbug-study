#!/usr/bin/env bash
# EC2(Ubuntu 24.04) 서버를 처음 한 번 준비하는 스크립트 (16주차)
#   내 컴퓨터에서:  ssh -i ~/.ssh/moa-ec2-key.pem ubuntu@서버IP 'bash -s' < deploy/ec2-setup.sh
# 여러 번 실행해도 결과가 같게 만들었다 (이미 된 것은 건너뛴다)
set -euo pipefail  # 명령 하나라도 실패하면 그 자리에서 멈춘다

echo "▶ 1. 스왑 1GB — 메모리(1GB)가 모자랄 때 디스크를 임시 메모리로 쓴다 (없으면 메모리가 꽉 찰 때 앱이 강제로 꺼진다)"
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 1G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null  # 재부팅해도 유지
fi

echo "▶ 2. Docker 설치 — Docker 공식 저장소에서 (Ubuntu 기본 저장소의 docker.io 보다 최신, compose 포함)"
if ! command -v docker >/dev/null; then
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl
  sudo install -m 0755 -d /etc/apt/keyrings
  sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  sudo chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

echo "▶ 3. 로그 크기 제한 — 컨테이너 로그가 디스크를 가득 채우지 않게 (파일당 10MB × 3개까지만)"
if [ ! -f /etc/docker/daemon.json ]; then
  echo '{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }' | sudo tee /etc/docker/daemon.json >/dev/null
  sudo systemctl restart docker
fi

echo "▶ 4. ubuntu 사용자가 sudo 없이 docker 를 쓰게 (다음 접속부터 적용)"
sudo usermod -aG docker ubuntu

echo "▶ 5. 배포 폴더"
mkdir -p ~/moa

echo "✅ 준비 끝"
docker --version
docker compose version
swapon --show
