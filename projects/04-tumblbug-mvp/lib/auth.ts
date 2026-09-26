import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { serverEnv } from "@/lib/env";

// 로그인 설정. 6주차에는 "인증에 필요한 표"를 만들기 위해 설정만 두고, 회원가입·로그인 화면은 7주차에 만든다.
export const auth = betterAuth({
  secret: serverEnv().BETTER_AUTH_SECRET,
  baseURL: serverEnv().BETTER_AUTH_URL,

  // 사용자·세션 정보를 우리 DB에 Drizzle을 통해 저장한다
  database: drizzleAdapter(db, { provider: "pg", schema }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },

  user: {
    additionalFields: {
      // 역할: 일반 사용자(user) 또는 관리자(admin). 가입할 때 스스로 정할 수 없다 (input: false)
      role: { type: "string", required: true, defaultValue: "user", input: false },
    },
  },

  plugins: [
    // 사용자 이름(닉네임) 칸 추가 — 창작자 이름으로 보여준다
    username({
      minUsernameLength: 3,
      maxUsernameLength: 20,
      validationOrder: { username: "post-normalization" },
      usernameValidator: (name) => /^[a-z0-9_]+$/.test(name),
    }),
    // 서버 액션에서 로그인할 때 쿠키를 자동으로 심어준다 (항상 마지막에 둘 것)
    nextCookies(),
  ],
});
