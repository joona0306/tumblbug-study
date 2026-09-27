// k6 부하 테스트: "남은 1개를 50명이 동시에" 결제 승인 → 초과 판매 0건인가 (16주차)
//
// 실행 (Docker 로 — k6 를 설치하지 않아도 된다):
//   docker run --rm -i -e BASE_URL=http://host.docker.internal:3000 -e LOAD_TEST_SECRET=… grafana/k6:2.3.0 run - < load/oversell.js
//   (EC2 에 할 때는 BASE_URL=https://3-34-218-244.sslip.io 처럼)
//
// 순서: setup(준비 1번) → 가상 사용자(VU) 50명이 동시에 1번씩 승인 요청 → teardown(결과 확인 1번)
import http from "k6/http";
import { check, fail } from "k6";
import exec from "k6/execution";

const BUYERS = 50;
const STOCK = 1;
const BASE = __ENV.BASE_URL;
const params = { headers: { "Content-Type": "application/json", "x-load-test-secret": __ENV.LOAD_TEST_SECRET } };

export const options = {
  scenarios: {
    oversell: {
      executor: "per-vu-iterations", // 가상 사용자마다 정해진 횟수만 — 50명이 동시에 출발해서 각자 1번
      vus: BUYERS,
      iterations: 1,
      maxDuration: "1m",
    },
  },
  // 기준(thresholds): 하나라도 어기면 k6 가 실패로 끝난다 (종료 코드 99)
  thresholds: {
    checks: ["rate==1"], // 모든 확인(check)이 통과
    http_req_failed: ["rate==0"], // 서버 에러·연결 실패 0건
    "http_req_duration{name:confirm}": ["p(95)<3000"], // 승인 요청 95%가 3초 안에
  },
};

export function setup() {
  if (!BASE || !__ENV.LOAD_TEST_SECRET) fail("BASE_URL, LOAD_TEST_SECRET 을 -e 로 넣어 주세요");
  const res = http.post(`${BASE}/api/load-test/setup`, JSON.stringify({ buyers: BUYERS, stock: STOCK }), params);
  if (res.status !== 200) fail(`준비 실패: ${res.status} ${res.body}`);
  return res.json(); // { projectId, rewardId, orders: [{ orderId, supporterId }, …] } → 모든 VU 에게 전달된다
}

export default function buyOne(data) {
  const order = data.orders[exec.vu.idInTest - 1]; // VU 번호(1~50)마다 서로 다른 후원자
  const res = http.post(`${BASE}/api/load-test/confirm`, JSON.stringify(order), { ...params, tags: { name: "confirm" } });
  check(res, {
    "승인 요청이 200": (r) => r.status === 200,
    "결과가 성공 또는 품절": (r) => ["paid", "failed"].includes(r.json("status")),
  });
}

export function teardown(data) {
  const res = http.get(`${BASE}/api/load-test/result?projectId=${data.projectId}`, params);
  const r = res.json();
  console.log(`결과 — 판매 ${r.soldQty}/${r.limitQty} · 성공 ${r.paid} · 품절 실패 ${r.soldOut} · 그 밖 ${r.other}`);
  check(r, {
    "초과 판매 0 (판매 수 ≤ 한정 수량)": (x) => x.soldQty <= x.limitQty,
    [`성공은 딱 ${STOCK}건`]: (x) => x.paid === STOCK,
    [`나머지 ${BUYERS - STOCK}건은 품절로 실패`]: (x) => x.soldOut === BUYERS - STOCK && x.other === 0,
  });
}
