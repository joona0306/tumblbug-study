"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import styles from "./AuthForm.module.css";

export function SignUpForm({ redirect }: { redirect: string }) {
  const [state, formAction, pending] = useActionState(signUp, null);
  const v = state?.values;
  const f = state?.fields;

  return (
    <form action={formAction} className={styles.form} noValidate>
      <input type="hidden" name="redirect" value={redirect} />
      <Field label="이메일" name="email" type="email" autoComplete="email" required defaultValue={v?.email} error={f?.email} />
      <Field
        label="사용자 이름"
        name="username"
        autoComplete="username"
        required
        helper="영문 소문자·숫자·밑줄(_) 3~20자"
        defaultValue={v?.username}
        error={f?.username}
      />
      <Field label="이름" name="name" required helper="창작자·후원자로 보일 이름 (예: 오늘의공방)" defaultValue={v?.name} error={f?.name} />
      <Field label="비밀번호" name="password" type="password" autoComplete="new-password" required helper="8자 이상" error={f?.password} />
      {state?.error && (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      )}
      <Button type="submit" fullWidth disabled={pending}>
        {pending ? "가입 중…" : "가입하기"}
      </Button>
      <p className={styles.alt}>
        이미 계정이 있나요? <Link href={`/login?redirect=${encodeURIComponent(redirect)}`}>로그인</Link>
      </p>
    </form>
  );
}
