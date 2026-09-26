import { NextResponse } from "next/server";
import { db } from "@/db";
import { apiError } from "@/lib/api";
import { PRIVATE, requireLikeUser } from "@/lib/likes-api";
import { addLike, getMyLikeIds } from "@/lib/queries/likes";
import { toFieldErrors } from "@/lib/validation/auth";
import { likeBodySchema } from "@/lib/validation/likes";

// GET /api/likes — 내가 찜한 프로젝트 번호들. 응답: { projectIds: [3, 1] }
export async function GET() {
  const auth = await requireLikeUser();
  if (auth.error) return auth.error;
  return NextResponse.json({ projectIds: await getMyLikeIds(db, auth.user.id) }, { headers: PRIVATE });
}

// POST /api/likes { projectId } — 찜하기. 새로 찜하면 201, 이미 찜해 있으면 200 (두 번 보내도 결과가 같다)
export async function POST(request: Request) {
  const auth = await requireLikeUser();
  if (auth.error) return auth.error;

  const parsed = likeBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID_BODY", "요청 값이 올바르지 않아요", { fields: toFieldErrors(parsed.error) });

  const result = await addLike(db, auth.user.id, parsed.data.projectId);
  if (result === "not_found") return apiError("NOT_FOUND", "프로젝트를 찾을 수 없어요");
  return NextResponse.json({ projectId: parsed.data.projectId, liked: true }, { status: result === "created" ? 201 : 200, headers: PRIVATE });
}
