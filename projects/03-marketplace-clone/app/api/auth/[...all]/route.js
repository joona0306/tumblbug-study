import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// /api/auth/ 로 시작하는 모든 요청(회원가입, 로그인, 로그아웃 등)을 Better Auth가 처리한다.
export const { GET, POST } = toNextJsHandler(auth);
