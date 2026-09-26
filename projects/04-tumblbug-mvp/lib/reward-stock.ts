import { and, eq, isNull, or, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { reward } from "@/db/schema";

// 리워드 재고를 "남아 있을 때만" 줄인다 (ADR-003 조건부 차감).
// 확인(SELECT)과 차감(UPDATE)을 따로 하면, 그 사이에 다른 사람이 끼어들어 둘 다 "남았다"고 보고 사 버릴 수 있다.
// UPDATE 한 문장 안에 조건을 넣으면 DB가 한 줄씩 잠그며 처리하므로, 동시에 와도 한 명만 성공한다.
// 반환: 차감했으면 true, 품절이라 못 했으면 false
export async function takeRewardStock(db: Db, rewardId: number, quantity: number): Promise<boolean> {
  const updated = await db
    .update(reward)
    .set({ soldQty: sql`${reward.soldQty} + ${quantity}` })
    .where(
      and(
        eq(reward.id, rewardId),
        // 무제한이거나, 늘린 뒤에도 한정 수량 이하일 때만
        or(isNull(reward.limitQty), sql`${reward.soldQty} + ${quantity} <= ${reward.limitQty}`),
      ),
    )
    .returning({ id: reward.id });
  return updated.length === 1;
}

// 결제 승인이 실패했을 때 차감한 수량을 되돌린다
export async function returnRewardStock(db: Db, rewardId: number, quantity: number): Promise<void> {
  await db
    .update(reward)
    .set({ soldQty: sql`${reward.soldQty} - ${quantity}` })
    .where(eq(reward.id, rewardId));
}
