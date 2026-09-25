// 토스페이먼츠 서버 API와 통신하는 코드. 비밀 키를 쓰므로 반드시 서버에서만 실행된다.
// (이 파일을 "use client" 파일에서 import 하면 안 된다)

// 토스페이먼츠에 "이 결제를 최종 승인해줘"라고 요청한다.
// 성공하면 { ok: true, payment }, 실패하면 { ok: false, code, message }를 돌려준다.
export async function confirmPayment({ paymentKey, orderId, amount }) {
  // 비밀 키 뒤에 ":"를 붙여 base64로 바꾼 값이 인증 정보다 (토스페이먼츠 규칙)
  const encodedKey = Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString("base64");

  const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: `Basic ${encodedKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });

  const data = await response.json();
  if (!response.ok) {
    return { ok: false, code: data.code, message: data.message };
  }
  return { ok: true, payment: data };
}
