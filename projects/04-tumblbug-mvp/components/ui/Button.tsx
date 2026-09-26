import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import styles from "./Button.module.css";

// Figma Button 컴포넌트와 같은 속성: Variant(Primary/Secondary/Ghost) × Size(L/M), Icon(선택)
// Hover·Focus·Disabled 상태는 CSS가 알아서 보여준다 (:hover, :focus-visible, disabled)
type Variant = "primary" | "secondary" | "ghost";
type Size = "l" | "m";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  fullWidth?: boolean;
  children: React.ReactNode;
};

function classNames(variant: Variant, size: Size, fullWidth: boolean) {
  return [styles.button, styles[variant], styles[size], fullWidth ? styles.full : ""].join(" ");
}

// <button> 으로 쓰는 버튼 (폼 제출, 클릭 동작)
export function Button({
  variant = "primary",
  size = "l",
  icon: Icon,
  fullWidth = false,
  children,
  ...rest
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={classNames(variant, size, fullWidth)} {...rest}>
      {Icon && <Icon size={20} aria-hidden="true" />}
      {children}
    </button>
  );
}

// 다른 페이지로 이동하는 버튼 모양 링크 (<a>). 이동은 링크, 동작은 버튼 — 화면 낭독기가 구분한다
export function ButtonLink({
  variant = "primary",
  size = "l",
  icon: Icon,
  fullWidth = false,
  children,
  href,
}: CommonProps & { href: string }) {
  return (
    <Link href={href} className={classNames(variant, size, fullWidth)}>
      {Icon && <Icon size={20} aria-hidden="true" />}
      {children}
    </Link>
  );
}
