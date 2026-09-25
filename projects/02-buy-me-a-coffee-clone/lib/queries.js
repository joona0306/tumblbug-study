import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { support } from "@/db/schema";

// 결제가 "완료(paid)"된 후원만 보여준다. 진행 중이거나 실패한 건은 후원이 아니다.
const isPaid = (creatorId) => and(eq(support.creatorId, creatorId), eq(support.status, "paid"));

// 공개 페이지용: 최근 후원 목록 (금액·결제 정보는 빼고 이름과 메시지만)
export async function getRecentSupports(creatorId, limit = 20) {
  return db
    .select({
      id: support.id,
      supporterName: support.supporterName,
      message: support.message,
      paidAt: support.paidAt,
    })
    .from(support)
    .where(isPaid(creatorId))
    .orderBy(desc(support.paidAt))
    .limit(limit);
}
