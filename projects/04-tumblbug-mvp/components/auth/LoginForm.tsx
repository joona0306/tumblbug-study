"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import styles from "./AuthForm.module.css";

// 로그인 폼. redirect = 로그인 후 돌아갈 주소 (서버에서 한 번 더 검사한다 — safeRedirectPath)
export function LoginForm({ redirect }: { redirect: string }) {
  const [state, formAction, pending] = useActionState(signIn, null);

  return (
    <form action={formAction} className={styles.form} noValidate>
      <input type="hidden" name="redirect" value={redirect} />
      <Field label="이메일" name="email" type="email" autoComplete="email" required defaultValue={state?.values.email} error={state?.fields?.email} />
      <Field label="비밀번호" name="password" type="password" autoComplete="current-password" required error={state?.fields?.password} />
      {state?.error && (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      )}
      <Button type="submit" fullWidth disabled={pending}>
        {pending ? "로그인 중…" : "로그인"}
      </Button>
      <p className={styles.alt}>
        처음이신가요? <Link href={`/signup?redirect=${encodeURIComponent(redirect)}`}>회원가입</Link>
      </p>
    </form>
  );
}
