"use client";

import { Minus, Plus } from "lucide-react";
import styles from "./QuantityStepper.module.css";

// Figma QuantityStepper: − [수량] +
export function QuantityStepper({ value, min = 1, max, onChange, label }: { value: number; min?: number; max: number; onChange: (value: number) => void; label: string }) {
  return (
    <div className={styles.stepper} role="group" aria-label={label}>
      <button type="button" className={styles.button} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`${label} 줄이기`}>
        <Minus size={20} aria-hidden="true" />
      </button>
      <output className={styles.value} aria-live="polite" aria-label={`${label} ${value}개`}>
        {value}
      </output>
      <button type="button" className={styles.button} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`${label} 늘리기`}>
        <Plus size={20} aria-hidden="true" />
      </button>
    </div>
  );
}
