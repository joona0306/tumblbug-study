import { ChevronRight, Heart, LayoutDashboard, Receipt } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ThemePicker } from "@/components/me/ThemePicker";
import { requireUser } from "@/lib/session";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "마이페이지 — 모아" };

const LINKS = [
  { href: "/me/fundings", label: "내 후원 내역", icon: Receipt },
  { href: "/me/likes", label: "내 찜", icon: Heart },
  { href: "/studio", label: "창작자 스튜디오", icon: LayoutDashboard },
];

// 마이페이지 (/me) — 로그인 필요 (proxy + requireUser)
// 내 정보 + 내 활동으로 가는 길 + 화면 테마 설정 (14주차)
export default async function MyPage() {
  const me = await requireUser("/me");
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <main className={`container ${styles.page}`}>
      <section className={styles.profile} aria-label="내 정보">
        <h1 className="text-heading-l">{me.name}</h1>
        <p className="text-body-s text-muted">{me.email}</p>
      </section>

      <nav aria-label="내 활동">
        <ul className={styles.links}>
          {LINKS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className={styles.link}>
                <Icon size={20} aria-hidden="true" />
                <span className="text-body-m-strong">{label}</span>
                <ChevronRight size={18} className={styles.chevron} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <ThemePicker current={theme} />
    </main>
  );
}
