import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./sentry.shared";

// Edge 환경(7주차의 미들웨어 등)에서 난 에러를 Sentry로 보낸다
Sentry.init(sentryOptions);
