import styles from "./ProgressBar.module.css";

// Figma ProgressBar. Figma에서는 10% 단위 변형이지만, 코드에서는 정확한 %로 그린다.
// percent: 달성률 (100을 넘을 수 있음 — 예: 132%). 막대는 100%에서 멈추고, 숫자는 그대로 보여준다.
export function ProgressBar({ percent, label }: { percent: number; label: string }) {
  const width = Math.min(Math.max(percent, 0), 100);
  return (
    <div
      className={styles.track}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(width)}
      aria-valuetext={`${Math.round(percent)}%`}
    >
      <div className={styles.fill} style={{ width: `${width}%` }} />
    </div>
  );
}
