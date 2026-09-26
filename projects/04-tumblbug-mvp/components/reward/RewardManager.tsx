import { asc, count, eq } from "drizzle-orm";
import { createReward, deleteReward, updateReward } from "@/app/actions/rewards";
import { Button } from "@/components/ui/Button";
import { db } from "@/db";
import { funding, reward } from "@/db/schema";
import { kstToday } from "@/lib/dates";
import { formatWon } from "@/lib/format";
import { REWARD_LIMITS } from "@/lib/validation/reward";
import { RewardForm } from "./RewardForm";
import styles from "./RewardManager.module.css";

// 수정 화면 아래의 리워드 관리 (PRD C-4): 목록 + 각 리워드 수정·삭제 + 새 리워드 추가
export async function RewardManager({ projectId }: { projectId: number }) {
  const rows = await db
    .select({
      id: reward.id,
      title: reward.title,
      description: reward.description,
      price: reward.price,
      limitQty: reward.limitQty,
      soldQty: reward.soldQty,
      deliveryMonth: reward.deliveryMonth,
      needsShipping: reward.needsShipping,
      fundings: count(funding.id), // 이 리워드로 들어온 후원 수 (결제 대기 포함)
    })
    .from(reward)
    .leftJoin(funding, eq(funding.rewardId, reward.id))
    .where(eq(reward.projectId, projectId))
    .groupBy(reward.id)
    .orderBy(asc(reward.sortOrder), asc(reward.id));
  const thisMonth = kstToday().slice(0, 7);

  return (
    <section className={styles.section} aria-labelledby="rewards-title">
      <div>
        <h2 id="rewards-title" className="text-heading-m">
          리워드 구성
        </h2>
        <p className="text-body-s text-muted">후원자가 고를 수 있는 선물이에요. 최대 {REWARD_LIMITS.perProject}개.</p>
      </div>

      {rows.map((r) => {
        const sold = r.fundings > 0;
        return (
          <article key={r.id} className={styles.item} aria-label={r.title}>
            <div className={styles.head}>
              <p className="text-body-m-strong">
                {formatWon(r.price)} · {r.title}
              </p>
              {!sold && (
                <form action={deleteReward}>
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="rewardId" value={r.id} />
                  <Button type="submit" variant="ghost" size="m" aria-label={`${r.title} 삭제`}>
                    삭제
                  </Button>
                </form>
              )}
            </div>
            <p className="text-caption text-muted">
              {r.limitQty === null ? "무제한" : `${r.limitQty}개 한정`} · 판매 {r.soldQty}개 · {r.deliveryMonth.slice(0, 7)} 전달 · {r.needsShipping ? "배송" : "배송 없음"}
            </p>
            <details className={styles.edit}>
              <summary>수정</summary>
              <RewardForm
                action={updateReward}
                projectId={projectId}
                rewardId={r.id}
                priceLocked={sold}
                thisMonth={thisMonth}
                submitLabel="리워드 저장"
                initialValues={{
                  title: r.title,
                  description: r.description,
                  price: String(r.price),
                  limitQty: r.limitQty === null ? "" : String(r.limitQty),
                  deliveryMonth: r.deliveryMonth.slice(0, 7),
                  needsShipping: r.needsShipping ? "on" : "",
                }}
              />
            </details>
          </article>
        );
      })}

      {rows.length < REWARD_LIMITS.perProject && (
        <div className={styles.new}>
          <h3 className="text-label" style={{ color: "var(--color-primary)" }}>
            새 리워드
          </h3>
          <RewardForm action={createReward} projectId={projectId} thisMonth={thisMonth} submitLabel="리워드 추가" />
        </div>
      )}
    </section>
  );
}
