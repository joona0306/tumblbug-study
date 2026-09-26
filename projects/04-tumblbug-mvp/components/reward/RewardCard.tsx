import { Truck } from "lucide-react";
import { formatWon } from "@/lib/format";
import styles from "./RewardCard.module.css";

export type RewardCardData = {
  title: string;
  description: string;
  price: number;
  limitQty: number | null;
  soldQty: number;
  deliveryMonth: string; // YYYY-MM-DD (그달 1일)
  needsShipping: boolean;
};

// Figma RewardCard (보기용). 후원 단계에서 고르는 버전(Selected·수량)은 10주차에
export function RewardCard({ reward }: { reward: RewardCardData }) {
  const remaining = reward.limitQty === null ? null : reward.limitQty - reward.soldQty;
  const soldOut = remaining !== null && remaining <= 0;
  const [year, month] = reward.deliveryMonth.split("-");

  return (
    <article className={`${styles.card} ${soldOut ? styles.soldOut : ""}`} aria-label={`${reward.title}${soldOut ? " (품절)" : ""}`}>
      <div className={styles.top}>
        <p className="text-heading-m">{formatWon(reward.price)}</p>
        {soldOut ? (
          <span className={`${styles.stock} ${styles.stockOut}`}>품절</span>
        ) : (
          remaining !== null && <span className={styles.stock}>{remaining}개 남음</span>
        )}
      </div>
      <p className="text-body-m-strong">{reward.title}</p>
      {reward.description && <p className="text-body-s text-muted">{reward.description}</p>}
      <p className={`text-caption text-muted ${styles.meta}`}>
        <Truck size={16} aria-hidden="true" />
        {year}년 {Number(month)}월 전달 예정{reward.needsShipping ? "" : " · 배송 없음"} · {reward.soldQty}명 선택
      </p>
    </article>
  );
}
