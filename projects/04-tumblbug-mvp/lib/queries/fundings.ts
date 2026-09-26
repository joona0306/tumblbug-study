import { and, desc, eq, isNotNull, or } from "drizzle-orm";
import type { Db } from "@/db";
import { funding, project, reward } from "@/db/schema";

export type MyFundingStatus = "paid" | "processing" | "failed";

// 내 후원 내역 (/me/fundings).
// 보여 주는 것: 결제 완료 + "승인 단계에 들어간" 후원(확인 중·승인 실패).
// 결제창에서 취소하거나 그냥 떠난 후원(payment_key 없음)은 빼서 목록을 깔끔하게 둔다 — 돈이 오간 적이 없는 기록이라서
export async function listMyFundings(db: Db, userId: string) {
  const rows = await db
    .select({
      id: funding.id,
      orderId: funding.orderId,
      amount: funding.amount,
      quantity: funding.quantity,
      status: funding.status,
      failReason: funding.failReason,
      createdAt: funding.createdAt,
      paidAt: funding.paidAt,
      projectId: project.id,
      projectTitle: project.title,
      imageUrl: project.imageUrl,
      rewardTitle: reward.title, // 리워드 없이 후원이면 null (LEFT JOIN)
      deliveryMonth: reward.deliveryMonth,
    })
    .from(funding)
    .innerJoin(project, eq(project.id, funding.projectId))
    .leftJoin(reward, eq(reward.id, funding.rewardId))
    .where(and(eq(funding.supporterId, userId), or(eq(funding.status, "paid"), isNotNull(funding.paymentKey))))
    .orderBy(desc(funding.createdAt), desc(funding.id));

  // DB 상태(pending·paid·failed)를 화면에서 쓰는 말로: 승인 단계의 pending = "확인 중"
  return rows.map(({ status, ...row }) => ({ ...row, status: (status === "pending" ? "processing" : status) as MyFundingStatus }));
}
