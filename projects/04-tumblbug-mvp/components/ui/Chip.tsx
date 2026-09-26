import Link from "next/link";
import styles from "./Chip.module.css";

// Figma Chip: Selected = true / false.
// 필터 칩은 "주소(URL)를 바꾸는 링크"다 → 선택 상태가 주소에 남아 새로고침·공유해도 유지된다 (URL 상태)
export function Chip({ href, selected = false, children }: { href: string; selected?: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`${styles.chip} ${selected ? styles.selected : ""}`} aria-current={selected ? "true" : undefined}>
      {children}
    </Link>
  );
}
