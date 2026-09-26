import { NextResponse } from "next/server";
import { db } from "@/db";
import { apiError } from "@/lib/api";
import { PRIVATE, requireLikeUser } from "@/lib/likes-api";
import { removeLike } from "@/lib/queries/likes";
import { projectIdSchema } from "@/lib/validation/likes";

// DELETE /api/likes/3 — 찜 취소. 찜하지 않았던 프로젝트여도 200 (결과는 어차피 "찜 안 한 상태")
export async function DELETE(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await requireLikeUser();
  if (auth.error) return auth.error;

  const parsed = projectIdSchema.safeParse((await params).projectId);
  if (!parsed.success) return apiError("INVALID_QUERY", "프로젝트 번호가 올바르지 않아요", { fields: { projectId: parsed.error.issues[0]?.message } });

  await removeLike(db, auth.user.id, parsed.data);
  return NextResponse.json({ projectId: parsed.data, liked: false }, { headers: PRIVATE });
}
