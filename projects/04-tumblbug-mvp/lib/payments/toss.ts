import "server-only";
import { serverEnv } from "@/lib/env";

// 토스페이먼츠 서버 API (2단계 lib/toss.js 를 TypeScript로 옮기고 "결제 조회"를 더했다).
// 시크릿 키를 쓰므로 서버에서만 실행된다 (server-only: 브라우저 코드에서 import 하면 빌드가 멈춘다)

// 토스가 알려 주는 결제 상태 중 우리가 쓰는 것
//  DONE = 승인 완료, CANCELED = 취소, ABORTED = 승인 실패, EXPIRED = 30분 안에 승인하지 않아 만료
export type TossPayment = { paymentKey: string; orderId: string; status: string; totalAmount: number };
export type TossResult = { ok: true; payment: TossPayment } | { ok: false; code: string; message: string };

// 결제 승인·조회를 하는 "도구"의 모양. 진짜 도구(tossClient)와 테스트용 가짜 도구가 같은 모양을 따른다
export type TossClient = {
  confirm(input: { paymentKey: string; orderId: string; amount: number }): Promise<TossResult>;
  getPayment(paymentKey: string): Promise<TossResult>;
};

async function call(path: string, init?: { method: "POST"; body: unknown }): Promise<TossResult> {
  const secretKey = serverEnv().TOSS_SECRET_KEY;
  if (!secretKey) return { ok: false, code: "NO_SECRET_KEY", message: "결제 설정(TOSS_SECRET_KEY)이 없어요" };

  // 시크릿 키 뒤에 ":"를 붙여 base64로 바꾼 값이 인증 정보다 (토스 규칙)
  const response = await fetch(`https://api.tosspayments.com${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`, "Content-Type": "application/json" },
    body: init ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(15_000), // 15초 안에 답이 없으면 포기 → "결과를 모름"으로 처리한다
  });
  const data = await response.json();
  if (!response.ok) return { ok: false, code: String(data.code), message: String(data.message) };
  return { ok: true, payment: data as TossPayment };
}

export const tossClient: TossClient = {
  // 결제 승인: "이 결제를 이 금액으로 최종 승인해 줘"
  confirm: (input) => call("/v1/payments/confirm", { method: "POST", body: input }),
  // 결제 조회: 토스가 알고 있는 이 결제의 "진짜" 상태 (웹훅 내용을 믿지 않고 여기서 다시 확인한다)
  getPayment: (paymentKey) => call(`/v1/payments/${encodeURIComponent(paymentKey)}`),
};
