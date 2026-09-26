import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { project, reward } from "@/db/schema";
import { isEnded } from "@/lib/project-status";
import type { FundingDraftInput } from "@/lib/validation/funding";
import { needsShipping, rewardStepError, shippingStepError, totalAmount } from "./rules";

export type Quote =
  | { ok: true; amount: number; rewardId: number | null; quantity: number; needsShipping: boolean }
  | { ok: false; error: string; step: 1 | 2 | null }; // step = 고치러 돌아갈 단계 (null = 후원할 수 없음)

// 결제 직전 서버 검사: "지금 DB 기준으로" 이 후원서가 올바른지 보고, 총액을 서버가 다시 계산한다.
// 브라우저의 검사(rules.ts)와 같은 규칙을 쓰지만, 값은 브라우저가 아니라 DB에서 새로 읽는다
//  - 그 사이에 마감됐을 수도, 리워드가 품절됐을 수도, 누군가 개발자 도구로 값을 바꿨을 수도 있다
export async function quoteFunding(db: Db, supporterId: string, draft: FundingDraftInput, now = new Date()): Promise<Quote> {
  const [p] = await db
    .select({ id: project.id, creatorId: project.creatorId, deadline: project.deadline, hidden: project.hidden })
    .from(project)
    .where(eq(project.id, draft.projectId));
  if (!p || p.hidden) return { ok: false, error: "후원할 수 없는 프로젝트예요", step: null };
  if (isEnded(p.deadline, now)) return { ok: false, error: "마감된 프로젝트예요", step: null };
  if (p.creatorId === supporterId) return { ok: false, error: "내 프로젝트에는 후원할 수 없어요", step: null };

  // 이 프로젝트의 리워드만 읽는다 → 다른 프로젝트의 리워드 번호를 끼워 넣으면 "없는 리워드"가 된다
  const rewards = await db
    .select({ id: reward.id, price: reward.price, limitQty: reward.limitQty, soldQty: reward.soldQty, needsShipping: reward.needsShipping })
    .from(reward)
    .where(eq(reward.projectId, p.id));

  const rewardError = rewardStepError(draft, rewards);
  if (rewardError) return { ok: false, error: rewardError, step: 1 };

  const shipping = needsShipping(draft, rewards);
  if (shipping) {
    const shippingError = shippingStepError(draft);
    if (shippingError) return { ok: false, error: shippingError, step: 2 };
  }

  return { ok: true, amount: totalAmount(draft, rewards), rewardId: draft.rewardId, quantity: draft.rewardId === null ? 1 : draft.quantity, needsShipping: shipping };
}
