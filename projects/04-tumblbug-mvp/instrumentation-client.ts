import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./sentry.shared";

// 브라우저에서 난 에러를 Sentry로 보낸다. 앱이 화면에 뜨기 전에 한 번 실행된다 (Next.js 규칙 파일)
Sentry.init(sentryOptions);

// 페이지 이동도 기록해서 "어느 화면으로 가다가 에러가 났는지" 알 수 있게 한다
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
