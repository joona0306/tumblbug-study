import type { Metadata } from "next";
import { redirect as goTo } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import styles from "@/components/auth/AuthForm.module.css";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "로그인 — 모아" };

// searchParams = 주소의 ?뒤 값. Next.js 16에서는 Promise 라서 await 로 꺼낸다
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const redirectTo = safeRedirectPath((await searchParams).redirect);
  if (await getCurrentUser()) goTo(redirectTo); // 이미 로그인했으면 바로 보낸다

  return (
    <main className={`container ${styles.page}`}>
      <h1 className="text-heading-l">
        작은 응원이 모여
        <br />
        창작이 완성돼요
      </h1>
      <LoginForm redirect={redirectTo} />
    </main>
  );
}
