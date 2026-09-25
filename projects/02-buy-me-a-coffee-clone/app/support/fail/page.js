import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { support, user } from "@/db/schema";

// 결제창에서 결제를 취소하거나 실패하면 토스가 이 주소로 보내준다.
// 예: /support/fail?code=PAY_PROCESS_CANCELED&message=...&orderId=...
export default async function SupportFailPage({ searchParams }) {
  const { code, message, orderId } = await searchParams;

  let creatorUsername = null;
  if (orderId) {
    const [order] = await db
      .select({ id: support.id, creatorUsername: user.username })
      .from(support)
      .innerJoin(user, eq(support.creatorId, user.id))
      .where(eq(support.orderId, String(orderId)));

    if (order) {
      creatorUsername = order.creatorUsername;
      // 진행 중이던 주문을 "실패"로 바꾸고 이유를 남긴다 (운영할 때 실패 원인을 모아 보기 위해)
      await db
        .update(support)
        .set({ status: "failed", failReason: String(code ?? "UNKNOWN") })
        .where(and(eq(support.id, order.id), eq(support.status, "pending")));
    }
  }

  // 구매자가 스스로 결제창을 닫은 경우는 오류가 아니므로 부드럽게 안내한다
  const canceled = code === "PAY_PROCESS_CANCELED";

  return (
    <div className="card profile">
      <h1>{canceled ? "결제를 취소했어요" : "결제에 실패했어요"}</h1>
      <p className="muted">{canceled ? "언제든 다시 후원할 수 있어요." : message}</p>
      {creatorUsername ? (
        <Link href={`/${creatorUsername}`}>크리에이터 페이지로 돌아가기</Link>
      ) : (
        <Link href="/">처음으로</Link>
      )}
    </div>
  );
}
