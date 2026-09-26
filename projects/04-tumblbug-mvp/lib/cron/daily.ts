import { and, eq, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { funding, rateLimit } from "@/db/schema";
import { markFailed, markPaid } from "@/lib/funding/settle";
import type { TossClient } from "@/lib/payments/toss";

// 하루 한 번 도는 예약 작업 (13주차) — Vercel Cron 이 /api/cron/daily 를 부른다 (vercel.json)
// 모든 작업은 "여러 번 돌려도 결과가 같게" 만든다 (멱등) — 예약 작업은 늦게·두 번 돌 수 있다

// ① 마감된 프로젝트의 상태를 DB에 확정 저장 (ADR-001: 화면은 항상 계산값, DB 값은 목록 필터·기록용)
//    아직 'funding' 인 것만 바꾼다 → 두 번 돌려도 이미 확정된 줄은 건드리지 않는다
//    마감 = 마감일 다음 날 00:00 한국 시간 (getProjectStatus·listing.ts 와 같은 규칙)
export async function finalizeProjectStatuses(db: Db): Promise<{ id: number; status: string }[]> {
  const result = await db.execute<{ id: number; status: string }>(sql`
    update project p
    set status = case
      when coalesce((select sum(f.amount) from funding f where f.project_id = p.id and f.status = 'paid'), 0) >= p.goal_amount then 'success'
      else 'failed' end
    where p.status = 'funding'
      and now() >= (p.deadline + 1)::timestamp at time zone 'Asia/Seoul'
    returning p.id, p.status`);
  return result.rows;
}

// ② 오래된 결제 대기 정리. scope.projectIds: 테스트에서 "이 프로젝트들만" 정리하게 할 때 (운영에서는 비워 둔다)
export async function expireStalePendings(db: Db, toss: TossClient, { olderThanMinutes = 60, scope }: { olderThanMinutes?: number; scope?: { projectIds: number[] } } = {}) {
  const old = and(
    eq(funding.status, "pending"),
    lt(funding.createdAt, sql`now() - make_interval(mins => ${olderThanMinutes})`),
    scope ? inArray(funding.projectId, scope.projectIds) : undefined,
  );

  // 2-1) 결제창을 열고 돌아오지 않은 후원 (승인 단계 전 — 돈도 재고도 오간 적 없음) → 실패로 기록만
  const abandoned = await db
    .update(funding)
    .set({ status: "failed", failReason: "ABANDONED" })
    .where(and(old, isNull(funding.paymentKey)))
    .returning({ id: funding.id });

  // 2-2) 승인 단계에서 결과를 모르는 채 남은 후원 (웹훅도 오지 않았음) → 토스에 직접 물어서 맞춘다
  const unknown = await db
    .select({ id: funding.id, orderId: funding.orderId, rewardId: funding.rewardId, quantity: funding.quantity, paymentKey: funding.paymentKey })
    .from(funding)
    .where(and(old, isNotNull(funding.paymentKey)));

  const reconciled = { paid: 0, failed: 0, skipped: 0 };
  for (const f of unknown) {
    try {
      const result = await toss.getPayment(f.paymentKey!);
      if (result.ok && result.payment.status === "DONE" && result.payment.orderId === f.orderId) {
        await markPaid(db, f, result.payment);
        reconciled.paid += 1;
      } else if (result.ok && result.payment.status === "IN_PROGRESS") {
        reconciled.skipped += 1; // 아직 진행 중 — 다음 날 다시 본다
      } else {
        // 토스가 모르는 결제(NOT_FOUND)·취소·만료 → 실패 + 차감했던 재고 되돌리기
        await markFailed(db, f, result.ok ? `EXPIRED_${result.payment.status}` : `EXPIRED_${result.code}`);
        reconciled.failed += 1;
      }
    } catch {
      reconciled.skipped += 1; // 토스 조회가 안 됨(네트워크) — 다음 날 다시 본다
    }
  }
  return { abandoned: abandoned.length, ...reconciled };
}

// ③ 요청 수 제한 기록 청소 — 1분짜리 시간 칸이라 하루 지난 기록은 쓸모가 없다 (9주차에 "13주차 예약 작업이 지운다"고 적어 둠)
export async function cleanupRateLimits(db: Db): Promise<number> {
  const deleted = await db
    .delete(rateLimit)
    .where(lt(rateLimit.windowStart, sql`now() - interval '1 day'`))
    .returning({ key: rateLimit.key });
  return deleted.length;
}

export async function runDailyJobs(db: Db, toss: TossClient) {
  const finalized = await finalizeProjectStatuses(db);
  const pendings = await expireStalePendings(db, toss);
  const rateLimitRows = await cleanupRateLimits(db);
  return { finalized, pendings, rateLimitRows };
}
