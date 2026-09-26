import { z } from "zod";

// 회원가입·로그인 입력 검사. 에러 문장은 화면의 입력칸 아래에 그대로 보여준다.
export const signUpSchema = z.object({
  email: z.email({ error: "이메일 형식이 올바르지 않아요" }),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,20}$/, { error: "영문 소문자·숫자·밑줄(_)로 3~20자" }),
  name: z.string().trim().min(1, { error: "창작자·후원자 이름으로 보일 이름을 입력해 주세요" }).max(20, { error: "20자 이하로 입력해 주세요" }),
  password: z.string().min(8, { error: "비밀번호는 8자 이상이어야 해요" }).max(128),
});

export const signInSchema = z.object({
  email: z.email({ error: "이메일 형식이 올바르지 않아요" }),
  password: z.string().min(1, { error: "비밀번호를 입력해 주세요" }),
});

// 입력칸 이름 → 에러 문장 (칸마다 하나씩)
export type FieldErrors = Partial<Record<string, string>>;

// zod 검사 실패 결과를 "칸 이름 → 첫 번째 에러 문장"으로 바꾼다
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const flat = z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
  return Object.fromEntries(Object.entries(flat).map(([key, messages]) => [key, messages?.[0]]));
}
