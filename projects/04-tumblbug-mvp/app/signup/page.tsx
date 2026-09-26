import type { Metadata } from "next";
import { redirect as goTo } from "next/navigation";
import { SignUpForm } from "@/components/auth/SignUpForm";
import styles from "@/components/auth/AuthForm.module.css";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "회원가입 — 모아" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const redirectTo = safeRedirectPath((await searchParams).redirect);
  if (await getCurrentUser()) goTo(redirectTo);

  return (
    <main className={`container ${styles.page}`}>
      <h1 className="text-heading-l">회원가입</h1>
      <SignUpForm redirect={redirectTo} />
    </main>
  );
}
