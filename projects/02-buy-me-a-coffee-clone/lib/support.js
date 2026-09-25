// 후원 규칙을 한곳에 모아둔다. (화면과 서버가 같은 값을 쓰도록)

// 고를 수 있는 후원 금액(원). 이 목록에 없는 금액은 서버가 거절한다.
export const SUPPORT_AMOUNTS = [3000, 5000, 10000];

export const NAME_MAX_LENGTH = 20;
export const MESSAGE_MAX_LENGTH = 100;

// 3000 → "3,000원"
export function formatWon(amount) {
  return `${amount.toLocaleString("ko-KR")}원`;
}
