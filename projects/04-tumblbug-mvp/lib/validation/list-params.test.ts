import { describe, expect, it } from "vitest";
import { listHref, listParamsSchema } from "./list-params";

describe("listParamsSchema (URL 상태 검사)", () => {
  it("아무것도 없으면 모금중·마감 임박순", () => {
    expect(listParamsSchema.parse({})).toEqual({ category: undefined, status: "funding", sort: "deadline" });
  });

  it("잘못된 값은 에러 대신 기본값", () => {
    expect(listParamsSchema.parse({ category: "food", status: "done", sort: "random" })).toEqual({ category: undefined, status: "funding", sort: "deadline" });
  });

  it("올바른 값은 그대로", () => {
    expect(listParamsSchema.parse({ category: "music", status: "success", sort: "popular" })).toEqual({ category: "music", status: "success", sort: "popular" });
  });
});

describe("listHref", () => {
  const current = listParamsSchema.parse({ category: "music" });
  it("하나만 바꾸고 나머지는 유지, 기본값은 주소에서 뺀다", () => {
    expect(listHref(current, { sort: "popular" })).toBe("/projects?category=music&sort=popular");
    expect(listHref(current, { category: undefined })).toBe("/projects");
    expect(listHref(current, { status: "failed" })).toBe("/projects?category=music&status=failed");
  });
});
