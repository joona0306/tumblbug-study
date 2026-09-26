import { randomUUID } from "node:crypto";

// 테스트 데이터용 겹치지 않는 이름표 (주문 번호·사용자 ID·요청 수 키 등)
// "시각(밀리초) + 순번"은 겹칠 수 있다 — Vitest 는 테스트 파일들을 여러 작업자에서 "동시에" 돌리고,
// 순번은 파일(작업자)마다 0부터 따로 세므로 같은 밀리초에 같은 순번이 나온다 (14주차 CI 에서 실제로 겹쳤다)
// → 무작위 UUID 를 붙인다
export const uniq = (prefix: string) => `${prefix}-${randomUUID()}`;
