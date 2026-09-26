import type { LucideIcon } from "lucide-react";
import { ButtonLink } from "./Button";
import styles from "./EmptyState.module.css";

// 빈 화면 (Figma State/Empty): "비어 있다"만 말하지 말고, 왜 비었는지 + 다음에 할 일(버튼)을 함께 보여 준다
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className={styles.empty}>
      <Icon size={40} className={styles.icon} aria-hidden="true" />
      <p className="text-body-m-strong">{title}</p>
      {description && <p className="text-body-s text-muted">{description}</p>}
      {action && (
        <ButtonLink href={action.href} variant="secondary" size="m">
          {action.label}
        </ButtonLink>
      )}
    </div>
  );
}
