import { z } from "zod";
import { CATEGORY_VALUES } from "@/lib/categories";

// 목록 주소의 ?뒤 값(URL 상태) 검사. 주소는 누구나 고쳐서 보낼 수 있으므로 믿지 않는다.
// 잘못된 값이면 에러 대신 "없는 것"으로 보고 기본값을 쓴다 (?category=food → 전체)
const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) => z.enum(values).optional().catch(undefined);

export const listParamsSchema = z.object({
  category: optionalEnum(CATEGORY_VALUES as unknown as readonly [string, ...string[]]),
  status: optionalEnum(["funding", "success", "failed"] as const).transform((v) => v ?? "funding"),
  sort: optionalEnum(["deadline", "popular", "new"] as const).transform((v) => v ?? "deadline"),
});

export type ListParams = z.infer<typeof listParamsSchema>;

// 지금 조건에서 한 가지만 바꾼 주소 만들기 (칩·탭 링크용). 기본값은 주소에서 뺀다
export function listHref(current: ListParams, change: Partial<Record<keyof ListParams, string | undefined>>) {
  const next = { ...current, ...change };
  const params = new URLSearchParams();
  if (next.category) params.set("category", next.category);
  if (next.status && next.status !== "funding") params.set("status", next.status);
  if (next.sort && next.sort !== "deadline") params.set("sort", next.sort);
  const query = params.toString();
  return query ? `/projects?${query}` : "/projects";
}
