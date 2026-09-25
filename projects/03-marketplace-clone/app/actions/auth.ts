"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// 가입·로그인 폼이 서버에서 돌려받는 결과의 모양.
// 처음에는 아무 결과도 없으므로(null) "| null"을 붙인다.
export type AuthFormState = {
  error: string;
  email: string;
  username?: string; // ? = 있을 수도, 없을 수도 있음 (로그인 폼에는 username 이 없다)
} | null;

// Better Auth가 돌려주는 영어 에러 코드를 사용자에게 보여줄 한국어 문장으로 바꾼다.
// Record<string, string> = "문자열 키 → 문자열 값" 모양의 객체
const ERROR_MESSAGES: Record<string, string> = {
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "이미 가입된 이메일입니다.",
  USERNAME_IS_ALREADY_TAKEN: "이미 사용 중인 사용자 이름입니다.",
  USERNAME_TOO_SHORT: "사용자 이름은 3자 이상이어야 합니다.",
  USERNAME_TOO_LONG: "사용자 이름은 20자 이하여야 합니다.",
  INVALID_USERNAME: "사용자 이름은 영문 소문자, 숫자, 밑줄(_)만 쓸 수 있습니다.",
  PASSWORD_TOO_SHORT: "비밀번호는 8자 이상이어야 합니다.",
  INVALID_EMAIL: "이메일 형식이 올바르지 않습니다.",
  INVALID_EMAIL_OR_PASSWORD: "이메일 또는 비밀번호가 틀렸습니다.",
};

// catch 로 잡은 에러는 무엇이 던져졌는지 모르므로 타입이 unknown 이다.
function toMessage(error: unknown): string {
  if (error instanceof APIError) {
    const code = error.body?.code; // 코드가 없을 수도 있다 (string | undefined)
    return (code && ERROR_MESSAGES[code]) || "요청을 처리하지 못했습니다. 다시 시도해주세요.";
  }
  console.error(error); // 예상 못 한 에러는 서버 로그에 남긴다
  return "알 수 없는 오류가 발생했습니다.";
}

// 폼 값은 비어 있을 수도, 파일일 수도 있어서 타입이 복잡하다. 글자로 꺼내는 도우미.
function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}

// 회원가입: 폼에서 받은 값으로 Better Auth에 가입을 요청한다.
// (첫 번째 인자 prevState는 useActionState가 넘겨주는 "이전 결과"로, 여기선 쓰지 않는다)
export async function signUp(prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = text(formData, "email");
  const password = text(formData, "password");
  const username = text(formData, "username");

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
export async function signIn(prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = text(formData, "email");
  const password = text(formData, "password");

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
