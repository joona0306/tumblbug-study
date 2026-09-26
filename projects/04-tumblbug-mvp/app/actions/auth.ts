"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { type FieldErrors, signInSchema, signUpSchema, toFieldErrors } from "@/lib/validation/auth";

// 폼이 서버에서 돌려받는 결과: 폼 전체 에러(error) + 칸마다의 에러(fields) + 다시 채워 줄 값(values)
export type AuthFormState = {
  error?: string;
  fields?: FieldErrors;
  values: Record<string, string>;
} | null;

// Better Auth의 영어 에러 코드 → 한국어 문장
const ERROR_MESSAGES: Record<string, string> = {
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "이미 가입된 이메일이에요.",
  USERNAME_IS_ALREADY_TAKEN: "이미 사용 중인 사용자 이름이에요.",
  INVALID_EMAIL_OR_PASSWORD: "이메일 또는 비밀번호가 틀렸어요.",
};

function toMessage(error: unknown): string {
  if (error instanceof APIError) {
    const code = error.body?.code;
    return (code && ERROR_MESSAGES[code]) || "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.";
  }
  console.error(error); // 예상 못 한 에러는 서버 로그(와 Sentry)에 남긴다
  return "알 수 없는 오류가 났어요.";
}

// 폼 값을 글자로 꺼내기 (비밀번호는 다시 채워 주지 않는다)
function readForm(formData: FormData, names: string[]) {
  return Object.fromEntries(names.map((name) => [name, String(formData.get(name) ?? "")]));
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = readForm(formData, ["email", "username", "name", "password"]);
  const values = { email: raw.email, username: raw.username, name: raw.name }; // 비밀번호는 다시 채워 주지 않는다
  const redirectTo = safeRedirectPath(formData.get("redirect"));

  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) return { fields: toFieldErrors(parsed.error), values };

  try {
    await auth.api.signUpEmail({ body: parsed.data });
  } catch (error) {
    return { error: toMessage(error), values };
  }
  // 가입하면 바로 로그인된 상태(쿠키 발급) → 원래 가려던 곳으로
  redirect(redirectTo);
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = readForm(formData, ["email", "password"]);
  const values = { email: raw.email };
  const redirectTo = safeRedirectPath(formData.get("redirect"));

  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) return { fields: toFieldErrors(parsed.error), values };

  try {
    await auth.api.signInEmail({ body: parsed.data });
  } catch (error) {
    return { error: toMessage(error), values };
  }
  redirect(redirectTo);
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
