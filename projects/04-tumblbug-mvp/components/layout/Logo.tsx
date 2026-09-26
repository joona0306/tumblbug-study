import { Plus } from "lucide-react";
import Link from "next/link";
import styles from "./Logo.module.css";

// Figma Logo 컴포넌트 (예시 브랜드 "모아")
export function Logo() {
  return (
    <Link href="/" className={styles.logo} aria-label="모아 홈">
      <span className={styles.mark} aria-hidden="true">
        <Plus size={18} strokeWidth={3} />
      </span>
      <span className={styles.word}>모아</span>
    </Link>
  );
}
