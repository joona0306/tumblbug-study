import { CircleAlert, CircleCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import styles from "./FundResult.module.css";

// 결제 결과 화면 (Figma M07 성공 / M08 실패)
export function FundResult({
  tone,
  title,
  children,
  primary,
  secondary,
}: {
  tone: "success" | "error";
  title: string;
  children: React.ReactNode;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  const Icon = tone === "success" ? CircleCheck : CircleAlert;
  return (
    <main className={`container ${styles.page}`}>
      <Icon size={56} className={styles[tone]} aria-hidden="true" />
      <h1 className="text-heading-l">{title}</h1>
      <div className={styles.body}>{children}</div>
      <div className={styles.actions}>
        <ButtonLink href={primary.href} fullWidth>
          {primary.label}
        </ButtonLink>
        {secondary && (
          <ButtonLink href={secondary.href} variant="secondary" fullWidth>
            {secondary.label}
          </ButtonLink>
        )}
      </div>
    </main>
  );
}
