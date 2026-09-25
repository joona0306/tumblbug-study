"use client";

import { ANONYMOUS, loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { useEffect, useState } from "react";
import { createSupport } from "@/app/actions/support";
import { formatWon, MESSAGE_MAX_LENGTH, NAME_MAX_LENGTH, SUPPORT_AMOUNTS } from "@/lib/support";

// 브라우저에 공개해도 되는 "클라이언트 키" (NEXT_PUBLIC_ 으로 시작하는 환경 변수만 브라우저에서 읽을 수 있다)
const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

export default function SupportForm({ creatorUsername }) {
  const [amount, setAmount] = useState(SUPPORT_AMOUNTS[0]);
  const [supporterName, setSupporterName] = useState("");
  const [message, setMessage] = useState("");
  const [widgets, setWidgets] = useState(null); // 토스 결제위젯 도구
  const [ready, setReady] = useState(false); // 결제위젯이 화면에 다 그려졌는지
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  // 1. 처음 한 번: 토스페이먼츠 SDK를 불러와 결제위젯 도구를 만든다
  useEffect(() => {
    async function load() {
      const tossPayments = await loadTossPayments(clientKey);
      // 후원자는 로그인하지 않으므로 "비회원(ANONYMOUS)"으로 결제한다
      setWidgets(tossPayments.widgets({ customerKey: ANONYMOUS }));
    }
    load();
  }, []);

  // 2. 도구가 준비되면: 금액을 정하고 결제수단·약관 화면을 그린다
  useEffect(() => {
    if (!widgets) return;
    async function render() {
      await widgets.setAmount({ currency: "KRW", value: SUPPORT_AMOUNTS[0] });
      await Promise.all([
        widgets.renderPaymentMethods({ selector: "#payment-method", variantKey: "DEFAULT" }),
        widgets.renderAgreement({ selector: "#agreement", variantKey: "AGREEMENT" }),
      ]);
      setReady(true);
    }
    render();
  }, [widgets]);

  // 금액 버튼을 누르면 화면의 선택과 결제위젯의 금액을 함께 바꾼다
  async function chooseAmount(value) {
    setAmount(value);
    if (widgets) {
      await widgets.setAmount({ currency: "KRW", value });
    }
  }

  // 3. "후원하기": 서버에 주문을 먼저 만들고(금액 기록) → 토스 결제창을 연다
  async function handlePay() {
    setError(null);
    setPending(true);

    const order = await createSupport({ creatorUsername, amount, supporterName, message });
    if (order.error) {
      setError(order.error);
      setPending(false);
      return;
    }

    try {
      // 결제가 끝나면 토스가 successUrl(성공) 또는 failUrl(실패)로 이동시킨다
      await widgets.requestPayment({
        orderId: order.orderId,
        orderName: order.orderName,
        customerName: order.supporterName,
        successUrl: `${window.location.origin}/support/success`,
        failUrl: `${window.location.origin}/support/fail`,
      });
    } catch (e) {
      // 결제수단을 고르지 않았거나 약관에 동의하지 않은 경우 등
      setError(e?.message ?? "결제를 시작하지 못했어요. 다시 시도해주세요.");
      setPending(false);
    }
  }

  return (
    <div className="card support-card">
      <h2>☕ 커피 한 잔 사주기</h2>

      <fieldset className="amounts">
        <legend>후원 금액</legend>
        {SUPPORT_AMOUNTS.map((value, index) => (
          <label key={value} className={value === amount ? "amount selected" : "amount"}>
            <input
              type="radio"
              name="amount"
              value={value}
              checked={value === amount}
              onChange={() => chooseAmount(value)}
            />
            {"☕".repeat(index + 1)} {formatWon(value)}
          </label>
        ))}
      </fieldset>

      <label>
        내 이름 (비우면 익명)
        <input
          value={supporterName}
          onChange={(e) => setSupporterName(e.target.value)}
          maxLength={NAME_MAX_LENGTH}
        />
      </label>
      <label>
        응원 메시지
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={MESSAGE_MAX_LENGTH}
          rows={3}
        />
      </label>

      {/* 토스페이먼츠 결제위젯이 이 두 칸 안에 그려진다 */}
      <div id="payment-method" />
      <div id="agreement" />

      {error && <p className="error">{error}</p>}
      <button type="button" onClick={handlePay} disabled={!ready || pending}>
        {!ready ? "결제 준비 중..." : pending ? "결제창 여는 중..." : `${formatWon(amount)} 후원하기`}
      </button>
    </div>
  );
}
