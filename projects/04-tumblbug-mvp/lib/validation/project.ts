import { z } from "zod";
import { CATEGORY_VALUES } from "@/lib/categories";
import { addDays } from "@/lib/dates";

// 프로젝트 등록·수정 입력 검사 (PRD C-1). 에러 문장은 입력칸 아래에 그대로 보인다.
// DB의 CHECK(목표 금액 1만~1억)와 같은 규칙 — 여기서 먼저 친절하게 알려주고, DB는 마지막 방어선.

export const PROJECT_LIMITS = {
  titleMax: 50,
  summaryMax: 80,
  descriptionMax: 5000,
  goalMin: 10_000,
  goalMax: 100_000_000,
  deadlineMinDays: 1, // 가장 빠른 마감: 내일
  deadlineMaxDays: 60, // 가장 늦은 마감: 60일 뒤
} as const;

// "1,000,000" 처럼 쉼표를 넣어도 숫자로 읽는다
const wonAmount = z.preprocess(
  (value) => (typeof value === "string" ? Number(value.replaceAll(",", "").trim() || Number.NaN) : value),
  z.number({ error: "숫자로 입력해 주세요" }).int({ error: "원 단위 정수로 입력해 주세요" }),
);

// today(한국 시간 오늘)를 받아서 마감일 범위를 정한다 — 테스트에서 날짜를 고정할 수 있게
export function projectSchema(today: string) {
  const earliest = addDays(today, PROJECT_LIMITS.deadlineMinDays);
  const latest = addDays(today, PROJECT_LIMITS.deadlineMaxDays);
  return z.object({
    title: z.string().trim().min(1, { error: "제목을 입력해 주세요" }).max(PROJECT_LIMITS.titleMax, { error: `제목은 ${PROJECT_LIMITS.titleMax}자 이하로 써 주세요` }),
    summary: z
      .string()
      .trim()
      .min(1, { error: "한 줄 요약을 입력해 주세요" })
      .max(PROJECT_LIMITS.summaryMax, { error: `한 줄 요약은 ${PROJECT_LIMITS.summaryMax}자 이하로 써 주세요` }),
    description: z.string().trim().max(PROJECT_LIMITS.descriptionMax, { error: `소개는 ${PROJECT_LIMITS.descriptionMax}자 이하로 써 주세요` }),
    category: z.enum(CATEGORY_VALUES, { error: "카테고리를 골라 주세요" }),
    goalAmount: wonAmount.pipe(
      z
        .number()
        .min(PROJECT_LIMITS.goalMin, { error: "10,000원 이상 입력해 주세요" })
        .max(PROJECT_LIMITS.goalMax, { error: "1억 원 이하로 입력해 주세요" }),
    ),
    // 날짜 글자(YYYY-MM-DD)는 사전 순서 = 날짜 순서라서 글자 비교로 범위를 확인할 수 있다
    deadline: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "마감일을 골라 주세요" })
      .refine((d) => d >= earliest && d <= latest, { error: `마감일은 ${earliest} ~ ${latest} 사이로 골라 주세요` }),
  });
}

export type ProjectInput = z.infer<ReturnType<typeof projectSchema>>;
