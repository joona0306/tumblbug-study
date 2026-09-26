import styles from "./Badge.module.css";

// Figma Badge: Status = Funding / Success / Failed / Urgent
// 값은 나중에 getProjectStatus() 결과와 1:1로 연결된다 (8주차). 색만으로 구분하지 않도록 항상 글자를 함께 쓴다.
export type BadgeStatus = "funding" | "success" | "failed" | "urgent";

const DEFAULT_LABEL: Record<BadgeStatus, string> = {
  funding: "모금중",
  success: "성공",
  failed: "실패",
  urgent: "마감 임박",
};

export function Badge({ status, children }: { status: BadgeStatus; children?: React.ReactNode }) {
  return <span className={`${styles.badge} ${styles[status]}`}>{children ?? DEFAULT_LABEL[status]}</span>;
}
