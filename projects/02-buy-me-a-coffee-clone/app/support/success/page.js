import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { support, user } from "@/db/schema";
import { formatWon } from "@/lib/support";
import { confirmPayment } from "@/lib/toss";

// 결제창에서 결제가 끝나면 토스가 이 주소로 보내준다.
// 예: /support/success?paymentKey=...&orderId=...&amount=5000
// 아직 "결제 승인" 전이다. 여기서 서버가 확인하고 승인해야 결제가 최종 완료된다.
export default async function SupportSuccessPage({ searchParams }) {
  const { paymentKey, orderId, amount } = await searchParams;

  // 1. 우리 DB에서 이 주문을 찾는다 (createSupport 가 만들어 둔 줄)
  const [order] = await db
    .select({
      id: support.id,
      amount: support.amount,
      status: support.status,
      creatorUsername: user.username,
    })
    .from(support)
    .innerJoin(user, eq(support.creatorId, user.id))
    .where(eq(support.orderId, String(orderId)));

  if (!order) {
    return <Result title="주문을 찾을 수 없어요" message="결제 정보가 올바르지 않습니다." />;
  }

  // 새로고침 등으로 다시 들어온 경우: 이미 끝난 주문이면 결과만 보여준다
  if (order.status === "paid") {
    return <Thanks order={order} />;
  }
  if (order.status === "failed") {
    return <Result title="결제가 완료되지 않았어요" message="처음부터 다시 후원해주세요." order={order} />;
  }

  // 2. 가장 중요한 검사: 주소에 담겨 온 금액이 서버가 기록한 금액과 같은가?
  //    누군가 결제위젯의 금액을 조작했다면 여기서 걸러진다.
  if (Number(amount) !== order.amount) {
    await markFailed(order.id, "AMOUNT_MISMATCH");
    console.error(`[결제] 금액 불일치 orderId=${orderId} 요청=${amount} 기록=${order.amount}`);
    return <Result title="결제 금액이 올바르지 않아요" message="결제를 승인하지 않았습니다." order={order} />;
  }

  // 3. 토스페이먼츠에 최종 승인 요청 (금액은 브라우저가 아닌 "우리 DB의 금액"을 보낸다)
  const result = await confirmPayment({ paymentKey, orderId, amount: order.amount });

  if (!result.ok) {
    await markFailed(order.id, result.code);
    console.error(`[결제] 승인 실패 orderId=${orderId} code=${result.code} message=${result.message}`);
    return <Result title="결제를 승인하지 못했어요" message={result.message} order={order} />;
  }

  // 4. 승인 성공 → 결제 완료로 기록
  //    "아직 pending 인 경우에만" 바꾼다 (이미 처리된 줄을 다시 덮어쓰지 않도록)
  await db
    .update(support)
    .set({ status: "paid", paymentKey: String(paymentKey), paidAt: new Date() })
    .where(and(eq(support.id, order.id), eq(support.status, "pending")));

  return <Thanks order={order} />;
}

async function markFailed(id, reason) {
  await db
    .update(support)
    .set({ status: "failed", failReason: reason })
    .where(and(eq(support.id, id), eq(support.status, "pending")));
}

function Thanks({ order }) {
  return (
    <div className="card profile">
      <h1>☕ 후원해주셔서 고마워요!</h1>
      <p>{formatWon(order.amount)} 후원이 완료되었습니다.</p>
      <Link href={`/${order.creatorUsername}`}>크리에이터 페이지로 돌아가기</Link>
    </div>
  );
}

function Result({ title, message, order }) {
  return (
    <div className="card profile">
      <h1>{title}</h1>
      <p className="muted">{message}</p>
      {order ? <Link href={`/${order.creatorUsername}`}>크리에이터 페이지로 돌아가기</Link> : <Link href="/">처음으로</Link>}
    </div>
  );
}
