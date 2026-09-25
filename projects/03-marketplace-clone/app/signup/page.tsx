"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "@/app/actions/auth";

export default function SignupPage() {
  // state: 서버 액션이 돌려준 결과(에러 메시지 등), pending: 처리 중인지 여부
  const [state, formAction, pending] = useActionState(signUp, null);

  return (
    <div className="card">
      <h1>회원가입</h1>
      <form action={formAction}>
        <label>
          이메일
          <input name="email" type="email" required defaultValue={state?.email} />
        </label>
        <label>
          사용자 이름 (공개 페이지 주소가 됩니다)
          <input name="username" required minLength={3} maxLength={20} defaultValue={state?.username} />
        </label>
        <label>
          비밀번호 (8자 이상)
          <input name="password" type="password" required minLength={8} />
        </label>
        {state?.error && <p className="error">{state.error}</p>}
        <button type="submit" disabled={pending}>
          {pending ? "가입 중..." : "가입하기"}
        </button>
      </form>
      <p className="muted">
        이미 계정이 있나요? <Link href="/login">로그인</Link>
      </p>
    </div>
  );
}
