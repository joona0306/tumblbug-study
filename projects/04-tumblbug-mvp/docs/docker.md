# Docker 준비와 내 컴퓨터에서 띄워 보기 (16주차 1단계)

> 목표: 같은 앱을 **Docker 이미지**로 만들어, 내 컴퓨터에서 운영과 같은 모양으로 실행해 본다.
> 다음 단계(EC2)는 이 이미지를 서버에서 그대로 실행하는 것이다.
>
> 마지막 확인: 2026-09-27 · Windows 11 Home 10.0.26200 · WSL 2.7.14 · Docker Desktop 4.92.0 (엔진 29.8.0)

## 용어

| 용어 | 뜻 |
|---|---|
| **이미지 (image)** | 앱 + 앱이 도는 데 필요한 것(Node.js, 패키지, 빌드 결과)을 한 덩어리로 묶은 것. 어디서 실행해도 똑같이 동작한다 |
| **컨테이너 (container)** | 이미지를 실행한 것. 이미지가 "설계도"라면 컨테이너는 "지어진 집" |
| **Dockerfile** | 이미지를 만드는 순서표 |
| **docker compose** | 컨테이너 여러 개(앱 + DB)를 한 번에 띄우는 도구. 설정은 `compose.yaml` |
| **가상화 (Virtualization)** | 컴퓨터 안에서 또 하나의 컴퓨터(가상 머신)를 돌리게 하는 CPU 기능. 메인보드 설정(BIOS/UEFI)에서 켠다 |
| **가상 머신 플랫폼** | 그 가상화 기능을 Windows 가 쓰게 해 주는 Windows 부품 (WSL 2 에 꼭 필요) |
| **WSL (Linux용 Windows 하위 시스템)** | Windows 안에서 리눅스를 돌리는 기능. **WSL 2** 는 진짜 리눅스 커널을 가상 머신으로 돌린다 |
| **Docker Desktop** | Windows 에서 Docker 를 쓰게 해 주는 프로그램. WSL 2 위에 작은 리눅스(`docker-desktop`)를 알아서 만든다 → Ubuntu 를 따로 설치할 필요 없음 |

Docker 는 리눅스 기능으로 동작한다. 그래서 Windows 에서는 **가상화 → 가상 머신 플랫폼 → WSL 2 → Docker Desktop** 순서로 준비한다.

---

## 1. 내 Windows 버전 확인

`Win + R` → `winver` 입력 → Enter. 창에 나온 **버전**과 **OS 빌드**를 본다.

| | 필요한 것 (Docker 공식 문서, 2026-09-27 확인) |
|---|---|
| Windows 11 | 23H2 (빌드 22631) 이상 |
| Windows 10 | 22H2 (빌드 19045) 이상 — 더 낮으면 **Windows 업데이트**부터 |
| 공통 | 64비트, 메모리 8GB 이상, BIOS 에서 가상화 켜짐 |

요구 사항은 바뀔 수 있다 → 설치 전에 Docker 공식 문서 "Install Docker Desktop on Windows" 의 System requirements 를 한 번 본다.

## 2. 가상화가 켜져 있는지 확인

작업 관리자(`Ctrl + Shift + Esc`) → **성능** 탭 → **CPU** → 오른쪽 아래 **가상화: 사용**
- **사용 안 함**이면: 컴퓨터를 켤 때 BIOS/UEFI 설정(보통 `F2`·`Del`)에 들어가 Intel **VT-x** / AMD **SVM** 을 켠다 — 메뉴 위치는 제조사마다 다르다 ("제조사 이름 + 가상화 켜기" 로 검색)

## 3. Windows 기능 두 개 켜기 (관리자 권한 + 재부팅)

**화면으로 (권장)**
1. 시작 → **"Windows 기능 켜기/끄기"** 검색해서 열기
   - Windows 10 에서 검색이 안 되면: 제어판 → 프로그램 → **Windows 기능 켜기/끄기**
2. 두 개 모두 체크
   - ☑ **가상 머신 플랫폼** (Virtual Machine Platform)
   - ☑ **Linux용 Windows 하위 시스템** (Windows Subsystem for Linux)
3. 확인 → **재부팅**

**명령어로** — 시작 → **터미널**(Windows 10 은 **Windows PowerShell**) 오른쪽 클릭 → **관리자 권한으로 실행**:
```
wsl --install --no-distribution
```
→ 재부팅. (`--no-distribution` = Ubuntu 같은 리눅스는 설치하지 않고 WSL 만. Docker Desktop 이 자기 리눅스를 만든다)

## 4. WSL 최신으로 + 확인

일반 터미널에서:
```
wsl --update
wsl --status
```
- ✅ `기본 버전: 2` 가 나오고, "가상화가 활성화되지 않은…" 같은 경고가 **없으면** 된다 (있으면 아래 🆘)

## 5. Docker Desktop 설치

1. docker.com → **Docker Desktop for Windows** 받기 → 실행
2. 설치 화면
   - **Per-user (권장)** 이 기본으로 골라져 있다 → 그대로 (내 계정에만 설치, 관리자 권한이 덜 필요)
   - **Use WSL 2 instead of Hyper-V** 가 보이면 켠 채로 둔다 — Windows Home 에는 Hyper-V 가 없어서 **이 선택지가 아예 안 나올 수 있다 (정상, WSL 2 를 쓴다)**
3. 끝나면 Docker Desktop 실행

**처음 실행할 때 뜨는 것**
- **약관 (Docker Subscription Service Agreement)**: 읽고 **Accept** — 개인 학습용은 무료
- **로그인 / 가입 화면**: **Skip** (Continue without signing in) — 우리는 이미지를 GitHub(GHCR)에 올리므로 Docker 계정이 필요 없다
- **설문 (역할 등)**: Skip
- **"Linux용 Windows 하위 시스템" 환영 창**: WSL 을 처음 켤 때 한 번 뜨는 안내 → 닫는다
- 왼쪽 아래 **Engine running** (초록) 이면 끝

**✅ 확인하는 법** — 터미널(Git Bash 도 된다)에서:
```
docker version
wsl -l -v
```
- `docker version` 에 **Server** 부분이 나온다
- `wsl -l -v` 에 `docker-desktop   Running   2` 가 있다
- Git Bash 에서 `docker: command not found` 면 → Docker Desktop 설치 뒤 **터미널을 새로 연다** (새 프로그램 경로는 새 창부터 적용)

## 🆘 막혔을 때

| 증상 | 원인 → 해결 |
|---|---|
| `wsl --status` 에 "가상화가 활성화되지 않은 이 컴퓨터에서는 WSL2를 시작할 수 없습니다" | ① 3번의 **가상 머신 플랫폼**이 안 켜짐 (가장 흔하다 — "Linux용 Windows 하위 시스템"만 켠 경우) → 켜고 재부팅 ② 2번의 BIOS 가상화가 꺼짐 |
| Docker Desktop 이 "WSL 2 installation is incomplete" / 엔진이 안 켜짐 | `wsl --update` → 재부팅 → Docker Desktop 다시 실행 |
| 설치 화면에 WSL 2 선택지가 없음 | 정상 (Windows Home, 또는 새 버전 설치 화면). 설치 뒤 **Settings → General → Use the WSL 2 based engine** 이 보이면 켜져 있는지만 본다 |
| "새 UNIX 사용자 이름을 입력하세요" 창 | Ubuntu 같은 리눅스가 설치되는 중이다. 우리 실습엔 필요 없지만 설치해도 괜찮다 — 쓸 이름·비밀번호를 정해 입력 (이 비밀번호는 기억해 둔다) |
| Windows 10 인데 WSL 명령이 없음 | Windows 업데이트로 22H2 까지 올린 뒤 다시 |

---

## 6. 내 컴퓨터에서 앱 띄우기

프로젝트 폴더(`projects/04-tumblbug-mvp`)에서:
```
docker compose up --build
```
- 처음엔 Node·PostgreSQL 이미지를 내려받고 빌드하느라 **몇 분** 걸린다 (다음부터는 캐시로 빨라진다)
- 컨테이너 3개가 순서대로 뜬다: **db**(PostgreSQL) → **migrate**(표 만들기 + 예시 데이터, 끝나면 멈춤 — 정상) → **app**(모아)
- 값은 모두 컨테이너 안에서만 쓰는 연습용이다 (`compose.yaml`) → 결제 버튼·Sentry·사진 올리기는 꺼진 채로 동작한다

**✅ 확인하는 법**
- 브라우저로 http://localhost:3000 → 예시 프로젝트 목록이 보인다
- http://localhost:3000/api/health → `{"ok":true,"db":"ok",...}`
- 예시 계정으로 로그인: `supporter_kim@seed.moa.test` / `moa-dev-1234` (예시 데이터 전용 비밀번호)
- 다른 터미널에서 `docker ps` → app 과 db 가 **(healthy)**

**끄기·지우기**
```
docker compose down      # 컨테이너 끄기 (DB 데이터는 남는다)
docker compose down -v   # DB 데이터까지 지우기 (처음부터 다시)
```

## 이미지 안에는 무엇이 들어가나 (Dockerfile 요약)

| 단계 | 하는 일 | 최종 이미지에? |
|---|---|---|
| ① deps | `npm ci` (패키지 설치) | ✗ |
| ② migrator | DB 마이그레이션·예시 데이터 (개발 도구 필요) | ✗ (따로 쓰는 이미지) |
| ③ builder | `next build` → `.next/standalone` (실행에 필요한 파일만) | ✗ |
| ④ runner | standalone + 정적 파일만 복사, 일반 사용자 `node` 로 실행, 30초마다 `/api/health` 확인 | ✅ **약 350MB** |

- **비밀값은 이미지에 넣지 않는다** (`.dockerignore` 가 `.env*` 를 뺀다) — 이미지를 받은 누구나 안을 열어 볼 수 있다. 비밀값은 **실행할 때** 환경 변수로 넣는다
- `NEXT_PUBLIC_` 값만 예외: 브라우저 코드에 빌드할 때 새겨지므로 빌드 인자(`--build-arg`)로 넣는다 (공개돼도 되는 값만 이 이름을 쓴다)
