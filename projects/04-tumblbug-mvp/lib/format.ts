// 금액·달성률 표시 함수. 화면 여러 곳(카드·상세·대시보드)에서 같은 규칙으로 보여주기 위해 한 곳에 모은다.

// 1560000 → "1,560,000원"
export function formatWon(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

// 달성률(%) = 모인 금액 ÷ 목표 금액 × 100, 소수점 아래는 버린다.
// 버리는 이유: 99.9%를 "100%"로 올려 보여주면 아직 달성하지 못했는데 달성한 것처럼 보이기 때문.
// 100을 넘을 수 있다 (예: 132%).
export function achievementRate(raised: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.floor((raised / goal) * 100);
}
