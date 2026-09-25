"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Better Auth가 돌려주는 영어 에러 코드를 사용자에게 보여줄 한국어 문장으로 바꾼다.
const ERROR_MESSAGES = {
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "이미 가입된 이메일입니다.",
  USERNAME_IS_ALREADY_TAKEN: "이미 사용 중인 사용자 이름입니다.",
  USERNAME_TOO_SHORT: "사용자 이름은 3자 이상이어야 합니다.",
  USERNAME_TOO_LONG: "사용자 이름은 20자 이하여야 합니다.",
  INVALID_USERNAME: "사용자 이름은 영문 소문자, 숫자, 밑줄(_)만 쓸 수 있습니다.",
  PASSWORD_TOO_SHORT: "비밀번호는 8자 이상이어야 합니다.",
  INVALID_EMAIL: "이메일 형식이 올바르지 않습니다.",
  INVALID_EMAIL_OR_PASSWORD: "이메일 또는 비밀번호가 틀렸습니다.",
};

function toMessage(error) {
  if (error instanceof APIError) {
    return ERROR_MESSAGES[error.body?.code] ?? "요청을 처리하지 못했습니다. 다시 시도해주세요.";
  }
  console.error(error); // 예상 못 한 에러는 서버 로그에 남긴다
  return "알 수 없는 오류가 발생했습니다.";
}

// 회원가입: 폼에서 받은 값으로 Better Auth에 가입을 요청한다.
// (첫 번째 인자 prevState는 useActionState가 넘겨주는 "이전 결과"로, 여기선 쓰지 않는다)
export async function signUp(prevState, formData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const username = formData.get("username");

  try {
    await auth.api.signUpEmail({
      body: { email, password, username, name: username },
    });
  } catch (error) {
    return { error: toMessage(error), email, username };
  }

  // 가입에 성공하면 자동으로 로그인된 상태(쿠키 발급)가 되므로 대시보드로 보낸다.
  redirect("/dashboard");
}

// 로그인: 이메일과 비밀번호가 맞으면 세션 쿠키를 발급받는다.
export async function signIn(prevState, formData) {
  const email = formData.get("email");
  const password = formData.get("password");

  try {
    await auth.api.signInEmail({ body: { email, password } });
  } catch (error) {
    return { error: toMessage(error), email };
  }

  redirect("/dashboard");
}

// 로그아웃: DB의 세션을 지우고 브라우저의 로그인 쿠키도 삭제한 뒤 첫 화면으로 보낸다.
export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
