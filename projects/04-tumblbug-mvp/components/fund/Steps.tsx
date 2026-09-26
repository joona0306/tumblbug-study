import { Check } from "lucide-react";
import type { Step } from "@/lib/funding/rules";
import styles from "./Steps.module.css";

const LABELS = ["리워드 선택", "배송지", "확인·결제"] as const;

// Figma Steps: 지금 어느 단계인지 (지난 단계는 체크 표시)
export function Steps({ current }: { current: Step }) {
  return (
    <ol className={styles.steps} aria-label="후원 단계">
      {LABELS.map((label, i) => {
        const step = (i + 1) as Step;
        const state = step < current ? "done" : step === current ? "current" : "todo";
        return (
          <li key={label} className={`${styles.step} ${styles[state]}`} aria-current={state === "current" ? "step" : undefined}>
            <span className={styles.dot} aria-hidden="true">
              {state === "done" ? <Check size={14} strokeWidth={3} /> : step}
            </span>
            <span className={styles.label}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
