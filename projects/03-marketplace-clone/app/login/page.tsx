"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, null);

  return (
    <div className="card">
      <h1>로그인</h1>
      <form action={formAction}>
        <label>
          이메일
          <input name="email" type="email" required defaultValue={state?.email} />
        </label>
        <label>
          비밀번호
          <input name="password" type="password" required />
        </label>
        {state?.error && <p className="error">{state.error}</p>}
        <button type="submit" disabled={pending}>
          {pending ? "로그인 중..." : "로그인"}
        </button>
      </form>
      <p className="muted">
        계정이 없나요? <Link href="/signup">회원가입</Link>
      </p>
    </div>
  );
}
