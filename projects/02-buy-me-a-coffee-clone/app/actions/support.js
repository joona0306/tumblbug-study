"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { support, user } from "@/db/schema";
import { MESSAGE_MAX_LENGTH, NAME_MAX_LENGTH, SUPPORT_AMOUNTS } from "@/lib/support";

// 결제창을 열기 "직전"에 부른다.
// 금액을 서버가 확인해서 DB에 적어 두는 것이 핵심. 결제가 끝나고 돌아왔을 때 이 금액과 비교한다.
export async function createSupport({ creatorUsername, amount, supporterName, message }) {
  // 1. 금액은 정해진 목록 중 하나여야 한다 (브라우저가 보낸 값을 그대로 믿지 않는다)
  const price = Number(amount);
  if (!SUPPORT_AMOUNTS.includes(price)) {
    return { error: "후원 금액을 다시 선택해주세요." };
  }

  // 2. 입력값 정리 + 글자 수 검사
  const name = (supporterName ?? "").trim() || "익명";
  const text = (message ?? "").trim();
  if (name.length > NAME_MAX_LENGTH) {
    return { error: `이름은 ${NAME_MAX_LENGTH}자 이하로 써주세요.` };
  }
  if (text.length > MESSAGE_MAX_LENGTH) {
    return { error: `메시지는 ${MESSAGE_MAX_LENGTH}자 이하로 써주세요.` };
  }

  // 3. 후원받을 크리에이터가 실제로 있는지 확인
  const [creator] = await db
    .select({ id: user.id, username: user.username, displayUsername: user.displayUsername })
    .from(user)
    .where(eq(user.username, String(creatorUsername).toLowerCase()));
  if (!creator) {
    return { error: "크리에이터를 찾을 수 없습니다." };
  }

  // 4. 주문 번호를 만들고 "결제 진행 중(pending)" 상태로 저장
  //    randomUUID: 겹칠 일이 사실상 없는 무작위 문자열 (예: 3b241101-e2bb-4255-8caf-4136c566a962)
  const orderId = crypto.randomUUID();
  await db.insert(support).values({
    creatorId: creator.id,
    supporterName: name,
    amount: price,
    message: text,
    orderId,
    status: "pending",
  });

  return {
    orderId,
    orderName: `${creator.displayUsername ?? creator.username}에게 커피 후원`,
    supporterName: name,
  };
}
