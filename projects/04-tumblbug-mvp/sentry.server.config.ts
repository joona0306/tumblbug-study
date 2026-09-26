import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./sentry.shared";

// 서버(Node.js)에서 난 에러를 Sentry로 보낸다
Sentry.init(sentryOptions);
