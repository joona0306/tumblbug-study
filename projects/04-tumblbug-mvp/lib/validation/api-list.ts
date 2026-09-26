import { z } from "zod";
import { CATEGORY_VALUES } from "@/lib/categories";

// GET /api/projects 의 ?뒤 값 검사.
// 화면 주소(list-params.ts)와 달리 API는 잘못된 값을 "조용히 기본값"으로 바꾸지 않고 400으로 알린다
// — API를 쓰는 프로그램(우리 화면의 무한 스크롤 등)이 실수를 바로 알 수 있게.
export const apiListQuerySchema = z.object({
  category: z.enum(CATEGORY_VALUES as [string, ...string[]], { error: "정해진 카테고리가 아니에요" }).optional(),
  status: z.enum(["funding", "success", "failed"], { error: "funding·success·failed 중 하나여야 해요" }).default("funding"),
  sort: z.enum(["deadline", "popular", "new"], { error: "deadline·popular·new 중 하나여야 해요" }).default("deadline"),
  limit: z.coerce.number({ error: "숫자여야 해요" }).int().min(1, { error: "1~24 사이여야 해요" }).max(24, { error: "1~24 사이여야 해요" }).default(12),
  cursor: z.string().max(200).optional(),
});
