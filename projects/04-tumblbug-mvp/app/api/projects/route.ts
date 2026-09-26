import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { apiError } from "@/lib/api";
import type { Category } from "@/lib/categories";
import { decodeCursor } from "@/lib/cursor";
import { listProjectsPage } from "@/lib/queries/listing";
import { toFieldErrors } from "@/lib/validation/auth";
import { apiListQuerySchema } from "@/lib/validation/api-list";

// GET /api/projects?category=&status=&sort=&limit=&cursor=
// 목록 무한 스크롤용 공개 API. 응답: { items: [...], nextCursor: "…" | null }
export async function GET(request: NextRequest) {
  const parsed = apiListQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return apiError("INVALID_QUERY", "요청 값이 올바르지 않아요", { fields: toFieldErrors(parsed.error) });
  }
  const { cursor: rawCursor, category, ...options } = parsed.data;
  const cursor = decodeCursor(rawCursor);
  if (rawCursor && !cursor) {
    return apiError("INVALID_QUERY", "커서가 올바르지 않아요", { fields: { cursor: "처음부터 다시 불러와 주세요" } });
  }

  const page = await listProjectsPage(db, { ...options, category: category as Category | undefined, cursor });

  return NextResponse.json(page, {
    headers: {
      // 누구에게나 같은 공개 데이터 → CDN(Vercel)이 30초 동안 저장해 두고 대신 답한다.
      // 30초가 지나면 60초 동안은 저장본을 먼저 주고 뒤에서 새로 받아온다 (stale-while-revalidate)
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
