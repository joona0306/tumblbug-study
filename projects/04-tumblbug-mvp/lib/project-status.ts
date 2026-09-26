import { addDays } from "@/lib/dates";

// 모금 상태 계산 — ADR-001: 이 "순수 함수" 하나로 정의하고, 화면·예약 작업·SQL이 모두 같은 규칙을 따른다.
// 순수 함수 = 같은 입력이면 항상 같은 결과, 바깥(DB·현재 시각)을 몰래 읽지 않는다 → 테스트하기 쉽다.
// 그래서 "지금 시각(now)"도 인자로 받는다.

export type ProjectStatus = "funding" | "success" | "failed";

// 마감 시각: 마감일의 23:59:59(한국 시간)까지 후원할 수 있다
// = 다음 날 00:00 한국 시간 = 그날 15:00 UTC 가 되는 "순간"부터 마감
export function deadlineEnd(deadline: string): Date {
  return new Date(`${addDays(deadline, 1)}T00:00:00+09:00`);
}

export function isEnded(deadline: string, now: Date): boolean {
  return now.getTime() >= deadlineEnd(deadline).getTime();
}

export function getProjectStatus(input: { goalAmount: number; raised: number; deadline: string; now: Date }): ProjectStatus {
  if (!isEnded(input.deadline, input.now)) return "funding";
  // 목표에 "딱" 닿아도 성공 (이상, ≥)
  return input.raised >= input.goalAmount ? "success" : "failed";
}

// 카드·상세에 보여줄 남은 기간 글자
//  - 마감일이 오늘: "오늘 마감" / 내일 이후: "N일 남음" / 끝남: "마감"
export function remainingLabel(deadline: string, now: Date): string {
  if (isEnded(deadline, now)) return "마감";
  const days = daysLeft(deadline, now);
  return days === 0 ? "오늘 마감" : `${days}일 남음`;
}

// 오늘(한국 시간)부터 마감일까지 남은 날 수 (마감일이 오늘이면 0)
export function daysLeft(deadline: string, now: Date): number {
  const todayKst = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const ms = new Date(`${deadline}T00:00:00Z`).getTime() - new Date(`${todayKst}T00:00:00Z`).getTime();
  return Math.max(0, Math.round(ms / (24 * 60 * 60 * 1000)));
}

// 마감 3일 이내면 "D-3" 배지 (Figma Badge Urgent). 오늘 마감이면 "D-DAY"
export function urgentLabel(deadline: string, now: Date): string | null {
  if (isEnded(deadline, now)) return null;
  const days = daysLeft(deadline, now);
  if (days > 3) return null;
  return days === 0 ? "D-DAY" : `D-${days}`;
}
