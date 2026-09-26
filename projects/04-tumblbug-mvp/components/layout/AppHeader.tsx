import { LayoutDashboard, LogOut, Plus, User } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { HeaderLikes } from "@/components/like/HeaderLikes";
import { getCurrentUser } from "@/lib/session";
import { Logo } from "./Logo";
import styles from "./AppHeader.module.css";

// Figma AppHeader. 로그인 상태는 서버에서 확인해서 그린다 (브라우저 상태로 복사해 두지 않는다 — 상태 관리 지도)
export async function AppHeader() {
  const user = await getCurrentUser();

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Logo />
        <nav className={styles.nav} aria-label="주 메뉴">
          <Link href="/projects/new" className={styles.link}>
            <Plus size={18} aria-hidden="true" />
            <span className={styles.label}>프로젝트 올리기</span>
          </Link>
          {user ? (
            <>
              <HeaderLikes />
              <Link href="/studio" className={styles.link}>
                <LayoutDashboard size={18} aria-hidden="true" />
                <span className={styles.label}>스튜디오</span>
              </Link>
              {/* 이름을 누르면 내 후원 내역으로 (11주차) */}
              <Link href="/me/fundings" className={styles.link} title="내 후원 내역">
                <User size={18} aria-hidden="true" />
                <span className={styles.label}>{user.name}</span>
                <span className="sr-only"> — 내 후원 내역</span>
              </Link>
              <form action={signOut}>
                <button type="submit" className={styles.link}>
                  <LogOut size={18} aria-hidden="true" />
                  <span className={styles.label}>로그아웃</span>
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className={styles.link}>
              로그인
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
