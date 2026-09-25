# 01-linktree-clone — 1단계 정답 코드

`docs/01-linktree-clone/tutorial/` 교재를 따라 만든 **검증된 정답 코드**입니다.
교재를 따라 하다 막히면 내 코드와 이 코드를 비교해 보세요.

## 체크포인트
교재의 각 단계가 끝난 시점마다 git 태그를 달아 두었습니다.

```bash
git tag -l "linktree-*"                 # 체크포인트 목록 보기
git show linktree-week2-step1 --stat    # 해당 단계에서 바뀐 파일 보기
```

## 실행하는 법
```bash
npm install
# .env.local 파일을 만들고 교재 안내대로 값을 채운 뒤
npm run dev
```
브라우저에서 http://localhost:3000 을 열면 됩니다.
