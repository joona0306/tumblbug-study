# 03-marketplace-clone — 3단계 정답 코드

`docs/03-marketplace-clone/tutorial/` 교재를 따라 만든 **검증된 정답 코드**입니다.
1단계 코드에서 링크 기능을 걷어낸 로그인 뼈대로 시작해 **TypeScript로 전환**했습니다.

## 체크포인트
```bash
git tag -l "market-*"
```

## 실행하는 법
```bash
npm install
# .env.local 을 교재 안내대로 채운 뒤 (DB 주소, 인증 비밀키, Vercel Blob 토큰)
npm run db:migrate
npm run dev
```
