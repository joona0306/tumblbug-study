import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema";

// 공개 페이지 주소가 /사용자이름 이라서, 이미 쓰고 있는 주소와 겹치는 이름은 막는다.
// (예: 누가 "login"으로 가입하면 /login 페이지와 충돌)
const RESERVED_USERNAMES = ["login", "signup", "dashboard", "api", "admin"];

export const auth = betterAuth({
  // 사용자·세션 정보를 우리 Neon DB에 Drizzle을 통해 저장한다.
  database: drizzleAdapter(db, { provider: "pg", schema }),

  // 이메일 + 비밀번호 로그인을 켠다.
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },

  // user 표에 우리 서비스에 필요한 칸을 추가한다.
  user: {
    additionalFields: {
      // 크리에이터 한 줄 소개. 가입할 때는 받지 않고(input: false), 대시보드에서 수정한다.
      bio: { type: "string", required: false, input: false },
    },
  },

  plugins: [
    // user 표에 username 칸을 추가해주는 플러그인
    username({
      minUsernameLength: 3,
      maxUsernameLength: 20,
      // 입력값을 소문자로 바꾼 "다음에" 검사한다. (Andrew → andrew 로 통과)
      validationOrder: { username: "post-normalization" },
      usernameValidator: (name) =>
        /^[a-z0-9_]+$/.test(name) && !RESERVED_USERNAMES.includes(name),
    }),
    // 서버 액션에서 로그인할 때 쿠키를 자동으로 심어준다. (항상 마지막에 둘 것)
    nextCookies(),
  ],
});
